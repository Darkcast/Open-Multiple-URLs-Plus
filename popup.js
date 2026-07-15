'use strict';

// ── Constants ────────────────────────────────────────────────
const SK = {
  urlList:            'txt',
  lazyload:           'lazyload',
  random:             'random',
  reverse:            'reverse',
  preserve:           'preserve',
  deduplicate:        'deduplicate',
  handleAsSearchQuery:'handleAsSearchQuery',
  openInNewWindow:    'openInNewWindow',
  preCheck:           'preCheck',
  selectedTabGroupId: 'selectedTabGroupId',
  selectedContainerId:'selectedContainerId',
};

const NO_TAB_GROUP_ID  = -1;
const NEW_TAB_GROUP_ID = -2;
const NO_CONTAINER_ID  = 'NO_CONTAINER_ID';
const NEW_CONTAINER_ID = 'NEW_CONTAINER_ID';

const CHECK_CONCURRENCY = 5;   // parallel health-check fetches
const CHECK_TIMEOUT_MS  = 8000;

// ── State ────────────────────────────────────────────────────
const state = {
  urlList:             '',
  lazyload:            false,
  random:              false,
  reverse:             false,
  preserve:            false,
  deduplicate:         false,
  handleAsSearchQuery: false,
  openInNewWindow:     false,
  preCheck:            false,
  selectedTabGroupId:  NO_TAB_GROUP_ID,
  selectedContainerId: NO_CONTAINER_ID,
};

let checkResults = [];
let isChecking   = false;
let isCancelled  = false;
let isOpening    = false;

// ── DOM shorthand ────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── URL utilities ────────────────────────────────────────────
function splitLines(text, dedup) {
  const lines = text.split(/\r\n?|\n/g).filter(l => l.trim() !== '');
  return dedup ? [...new Set(lines)] : lines;
}

function hasValidSchema(url) {
  try { new URL(url); return true; } catch { return false; }
}

function normalizeURL(raw) {
  try {
    const u = new URL(raw.trim());
    const last = u.pathname.split('/').pop();
    if (!/\.[a-z0-9]+$/i.test(last) && !u.pathname.endsWith('/')) u.pathname += '/';
    return u.href;
  } catch { return raw.trim(); }
}

// Returns true when an entire line is a bare hostname/URL with no schema.
// e.g. "venafi-cyberark-provision-test-4.example.com" or "web.epay.example.com/path"
// Requires at least one dot, only hostname-safe chars, no spaces.
function looksLikeHostname(str) {
  return /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(:[0-9]+)?(\/[^\s]*)?$/i.test(str);
}

function extractURLs(text) {
  const seen = new Set();
  const urls = [];

  function add(raw) {
    const norm = normalizeURL(raw);
    if (!seen.has(norm)) { seen.add(norm); urls.push(norm); }
  }

  // Pass 1: extract URLs embedded in arbitrary prose (schema/www required by regex)
  const re = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»""'']))/gi;
  let m;
  while ((m = re.exec(text)) !== null) add(m[0]);

  // Pass 2: line-by-line fallback — catches bare hostnames the regex skips
  // Only runs on whole-line values so it doesn't create false positives in prose
  for (const raw of text.split(/\r\n?|\n/g)) {
    const line = raw.trim();
    if (!line) continue;
    if (looksLikeHostname(line) && !seen.has(normalizeURL('http://' + line))) {
      add('http://' + line);
    }
  }

  return urls.join('\n');
}

// ── Storage ──────────────────────────────────────────────────
async function loadStoredValues() {
  const data = await chrome.storage.local.get(Object.values(SK));
  state.urlList             = String(data[SK.urlList] ?? '');
  state.lazyload            = Boolean(data[SK.lazyload]);
  state.random              = Boolean(data[SK.random]);
  state.reverse             = Boolean(data[SK.reverse]);
  state.preserve            = Boolean(data[SK.preserve]);
  state.deduplicate         = Boolean(data[SK.deduplicate]);
  state.handleAsSearchQuery = Boolean(data[SK.handleAsSearchQuery]);
  state.openInNewWindow     = Boolean(data[SK.openInNewWindow]);
  // Default ON: checking URLs before opening is the core purpose of this
  // extension. Only an explicit stored false (user unchecked it) disables it.
  state.preCheck            = data[SK.preCheck] === undefined ? true : Boolean(data[SK.preCheck]);
  state.selectedTabGroupId  = Number(data[SK.selectedTabGroupId] ?? NO_TAB_GROUP_ID);
  state.selectedContainerId = data[SK.selectedContainerId] ?? NO_CONTAINER_ID;
}

function save(key, value) {
  chrome.storage.local.set({ [key]: value });
}

// ── Tab groups / containers ──────────────────────────────────
async function loadTabGroups() {
  if (!chrome.tabGroups) return [];
  const groups = await chrome.tabGroups.query({});
  return [
    { id: NO_TAB_GROUP_ID,  title: 'No Tab Group'  },
    { id: NEW_TAB_GROUP_ID, title: 'New Tab Group' },
    ...groups.map(g => ({ id: g.id, title: `${g.title}${g.title ? ' ' : ''}(${g.color})` })),
  ];
}

async function loadContainers() {
  if (!chrome.contextualIdentities) return [];
  try {
    const cis = await chrome.contextualIdentities.query({});
    return [
      { cookieStoreId: NO_CONTAINER_ID,  title: 'No Container'  },
      { cookieStoreId: NEW_CONTAINER_ID, title: 'New Container' },
      ...cis.map(ci => ({ cookieStoreId: ci.cookieStoreId, title: `${ci.name}${ci.name ? ' ' : ''}(${ci.color})` })),
    ];
  } catch { return []; }
}

function populateSelect(selectEl, items, valueKey, labelKey, selectedValue) {
  selectEl.innerHTML = '';
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value       = item[valueKey];
    opt.textContent = item[labelKey];
    if (String(item[valueKey]) === String(selectedValue)) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

// ── Health check ─────────────────────────────────────────────
async function checkUrl(rawUrl) {
  const url = hasValidSchema(rawUrl) ? rawUrl : 'http://' + rawUrl;
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

  try {
    let res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      cache: 'no-store',
    });

    // Some servers/WAFs block or misreport HEAD (405/501 = not implemented,
    // 403 = bot-protection false-positive on HEAD specifically) — retry GET
    // before trusting the status, otherwise a fine site reads as dead.
    if (res.status === 403 || res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
        cache: 'no-store',
      });
    }

    clearTimeout(timer);
    const s = res.status;
    // tier: alive = 2xx/3xx  |  reachable = 4xx/5xx (server up, resource broken)  |  dead = no connection
    const tier = (s >= 200 && s < 400) ? 'alive' : 'reachable';
    return { url, status: s, tier, ok: tier === 'alive', time: Date.now() - start };
  } catch (err) {
    clearTimeout(timer);
    const tier = err.name === 'AbortError' ? 'timeout' : 'dead';
    return { url, status: tier, tier, ok: false, time: Date.now() - start };
  }
}

async function withConcurrency(tasks, limit, onProgress) {
  const results = new Array(tasks.length);
  let next = 0;
  let done = 0;

  async function worker() {
    while (next < tasks.length) {
      if (isCancelled) break;
      const i = next++;
      results[i] = await tasks[i]();
      done++;
      onProgress(done, tasks.length);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

async function runHealthCheck() {
  if (isChecking) { cancelCheck(); return; }

  const lines = splitLines(state.urlList, state.deduplicate).filter(l => l.trim());
  if (!lines.length) return;

  isChecking  = true;
  isCancelled = false;
  checkResults = [];

  showBusy(`Checking 0/${lines.length}`);
  $('results-section').style.display = 'block';
  $('results-list').innerHTML = '';
  $('results-summary').textContent = `Checking 0 / ${lines.length}…`;
  $('results-actions').style.display = 'none';
  $('progress-bar').style.width = '0%';
  $('progress-label').textContent = `0 / ${lines.length}`;
  $('progress-wrap').style.display = 'flex';

  const tasks = lines.map(url => async () => {
    const result = await checkUrl(url);
    checkResults.push(result);
    appendResult(result);
    return result;
  });

  await withConcurrency(tasks, CHECK_CONCURRENCY, (done, total) => {
    const pct = Math.round((done / total) * 100);
    $('progress-bar').style.width = pct + '%';
    $('progress-label').textContent = `${done} / ${total}`;
    showBusy(`Checking ${done}/${total}`);
  });

  finishCheck();
}

function cancelCheck() {
  isCancelled = true;
}

function finishCheck() {
  isChecking = false;
  endBusy();
  $('progress-wrap').style.display = 'none';
  renderSummary();
}

function appendResult(r) {
  const clsMap = { alive: 'result-ok', reachable: 'result-reachable', timeout: 'result-timeout', dead: 'result-error' };
  const cls = clsMap[r.tier] ?? 'result-error';
  const badgeMap = { alive: String(r.status), reachable: String(r.status), timeout: 'TIMEOUT', dead: 'ERROR' };
  const badge = badgeMap[r.tier] ?? String(r.status);
  const time  = typeof r.time === 'number' ? r.time + 'ms' : '';

  const el = document.createElement('div');
  el.className = `result-item ${cls}`;
  el.innerHTML =
    `<span class="result-badge">${badge}</span>` +
    `<span class="result-url" title="${escHtml(r.url)}">${escHtml(r.url)}</span>` +
    `<span class="result-time">${time}</span>`;

  $('results-list').appendChild(el);
  $('results-list').scrollTop = $('results-list').scrollHeight;
}

function renderSummary() {
  const alive     = checkResults.filter(r => r.tier === 'alive').length;
  const reachable = checkResults.filter(r => r.tier === 'reachable').length;
  const timeout   = checkResults.filter(r => r.tier === 'timeout').length;
  const dead      = checkResults.filter(r => r.tier === 'dead').length;

  const cancelled = isCancelled ? ' <em style="opacity:.6">(cancelled)</em>' : '';
  $('results-summary').innerHTML =
    `<span class="pill pill-ok">✓ ${alive} alive</span>` +
    `<span class="pill pill-reachable">! ${reachable} reachable</span>` +
    `<span class="pill pill-timeout">⏱ ${timeout} timeout</span>` +
    `<span class="pill pill-error">✗ ${dead} dead</span>` +
    cancelled;

  if (alive > 0) {
    $('btn-open-alive').textContent = `Open alive (${alive})`;
    $('results-actions').style.display = 'flex';
  }
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Open URLs ────────────────────────────────────────────────

// Pre-check phase: runs checkUrl() in the popup (not background) so corporate
// proxies can't return a fake 200 for NXDOMAIN/unreachable hosts.
// customText already filtered (e.g. from "Open alive") skips this phase.
async function runPreCheck(lines) {
  const total = lines.length;
  const alive = [];
  let done = 0;
  let skipped = 0;

  isCancelled = false;

  const tasks = lines.map(rawUrl => async () => {
    const r = await checkUrl(rawUrl);
    done++;
    if (r.ok) {
      alive.push(r.url);
    } else {
      skipped++;
    }
    if (isOpening) {
      showBusy(`Checking ${done}/${total}` + (skipped ? ` · ${skipped} skipped` : ''));
      $('progress-bar').style.width = `${Math.round(done / total * 100)}%`;
      $('progress-label').textContent = `${done} / ${total}`;
    }
  });

  await withConcurrency(tasks, CHECK_CONCURRENCY, () => {});
  return alive;
}

async function openURLs(customText) {
  const rawText = (customText !== undefined ? customText : state.urlList).trim();
  if (!rawText) return;

  isOpening = true;
  $('progress-wrap').style.display = 'flex';
  $('progress-bar').style.width = '0%';

  let textToOpen = rawText;

  // Pre-check runs in popup — NOT in background — so proxy interference is avoided.
  // Skip if customText was explicitly provided (already filtered, e.g. "Open alive").
  if (state.preCheck && customText === undefined) {
    const lines = splitLines(rawText, state.deduplicate).filter(l => l.trim());
    $('progress-label').textContent = `0 / ${lines.length}`;
    showBusy(`Checking 0/${lines.length}`);

    const alive = await runPreCheck(lines);

    if (!isOpening) return; // cancelled during check phase

    if (!alive.length) {
      isOpening = false;
      showBusy('No reachable URLs found');
      setTimeout(() => { endBusy(); $('progress-wrap').style.display = 'none'; }, 2500);
      return;
    }

    textToOpen = alive.join('\n');
  }

  // Hand off to background for tab creation, now with a clean URL list.
  const total = splitLines(textToOpen, false).length;
  setOpeningUI(true, total, 0, 0);

  chrome.runtime.sendMessage({
    action:             'loadSites',
    text:               textToOpen,
    lazyloading:        state.lazyload,
    random:             state.random,
    reverse:            state.reverse,
    deduplicate:        false,       // already deduped if option was set
    handleAsSearchQuery:state.handleAsSearchQuery,
    selectedTabGroupId: state.selectedTabGroupId,
    selectedContainerId:state.selectedContainerId,
    openInNewWindow:    state.openInNewWindow,
  }).then(() => {
    isOpening = false;
    setOpeningUI(false);
  }).catch(() => {
    isOpening = false;
    setOpeningUI(false);
  });

  if (!state.preserve) {
    state.urlList = '';
    $('urls').value = '';
    save(SK.urlList, '');
    updateTabCount();
  }
}

function setOpeningUI(active, total, done, skipped) {
  if (active) {
    showBusy(`Opening ${done}/${total}` + (skipped > 0 ? ` · ${skipped} skipped` : ''));
    $('progress-wrap').style.display = 'flex';
    $('progress-bar').style.width = total > 0 ? `${Math.round(done / total * 100)}%` : '0%';
    $('progress-label').textContent = `${done} / ${total}`;
  } else {
    endBusy();
    $('progress-wrap').style.display = 'none';
  }
}

// Receive opening progress ticks from the background service worker.
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'loadProgress' && isOpening) {
    setOpeningUI(true, message.total, message.done, message.skipped ?? 0);
    if (message.done >= message.total) {
      isOpening = false;
      setOpeningUI(false);
    }
  }
});

// ── Busy mode (checking / opening) ───────────────────────────
// Swaps the action bar to a single live-status pill + Cancel button so the
// long "Checking 21/205 · 3s" text never overflows the 480px row.
let busyTimer = null;
let busyStart = 0;
let busyLabel = '';

function renderBusy() {
  const secs = Math.floor((Date.now() - busyStart) / 1000);
  $('busy-status').textContent = busyLabel + (secs > 0 ? ` · ${secs}s` : '');
}

function showBusy(label) {
  busyLabel = label;
  if ($('action-busy').style.display === 'none') {
    busyStart = Date.now();
    $('action-normal').style.display = 'none';
    $('action-busy').style.display = 'flex';
    clearInterval(busyTimer);
    busyTimer = setInterval(renderBusy, 500);
  }
  renderBusy();
}

function endBusy() {
  clearInterval(busyTimer);
  busyTimer = null;
  $('action-busy').style.display = 'none';
  $('action-normal').style.display = 'flex';
  updateTabCount();
}

// ── UI helpers ───────────────────────────────────────────────
function updateTabCount() {
  const count = state.urlList ? splitLines(state.urlList, state.deduplicate).length : 0;
  $('tab-count').textContent = count > 0 ? `(${count})` : '';
  $('warning').style.display = count >= 200 ? 'inline' : 'none';
}

// ── Init ─────────────────────────────────────────────────────
async function init() {
  await loadStoredValues();

  // Populate form
  $('urls').value             = state.urlList;
  $('opt-lazyload').checked   = state.lazyload;
  $('opt-random').checked     = state.random;
  $('opt-reverse').checked    = state.reverse;
  $('opt-preserve').checked   = state.preserve;
  $('opt-deduplicate').checked= state.deduplicate;
  $('opt-searchquery').checked= state.handleAsSearchQuery;
  $('opt-newwindow').checked  = state.openInNewWindow;
  $('opt-precheck').checked   = state.preCheck;

  updateTabCount();
  $('urls').select();

  // Resume the busy UI if a tab-opening batch is already running in the
  // background (e.g. popup was closed mid-batch and just reopened) — the
  // toolbar badge keeps ticking regardless, this just resyncs the panel.
  try {
    const status = await chrome.runtime.sendMessage({ action: 'getOpenStatus' });
    if (status) {
      isOpening = true;
      setOpeningUI(true, status.total, status.done, status.skipped);
    }
  } catch { /* background not reachable — nothing to resume */ }

  // Tab groups
  const tabGroups = await loadTabGroups();
  if (tabGroups.length > 2) {
    $('tabgroup-wrap').style.display = 'flex';
    populateSelect($('tabGroupSelection'), tabGroups, 'id', 'title', state.selectedTabGroupId);
  }

  // Containers
  const containers = await loadContainers();
  if (containers.length > 2) {
    $('container-wrap').style.display = 'flex';
    populateSelect($('containerSelection'), containers, 'cookieStoreId', 'title', state.selectedContainerId);
  }

  // ── Event listeners ──
  $('urls').addEventListener('input', e => {
    state.urlList = e.target.value;
    if (state.preserve) save(SK.urlList, state.urlList);
    updateTabCount();
  });

  $('btn-extract').addEventListener('click', () => {
    const out = extractURLs(state.urlList);
    $('urls').value = out;
    state.urlList = out;
    if (state.preserve) save(SK.urlList, out);
    updateTabCount();
  });

  $('btn-check').addEventListener('click', runHealthCheck);

  $('btn-open').addEventListener('click', () => { if (!isOpening) openURLs(); });

  $('btn-cancel-open').addEventListener('click', () => {
    // Stop both the popup pre-check phase and any ongoing background tab opening.
    isCancelled = true;
    isOpening = false;
    chrome.runtime.sendMessage({ action: 'cancelLoad' }).catch(() => {});
    setOpeningUI(false);
  });

  $('btn-open-alive').addEventListener('click', () => {
    const alive = checkResults.filter(r => r.ok).map(r => r.url).join('\n');
    openURLs(alive);
  });

  $('btn-copy-results').addEventListener('click', () => {
    const tsv = checkResults
      .map(r => [r.ok ? 'OK' : String(r.status).toUpperCase(), r.url, r.time + 'ms'].join('\t'))
      .join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      const btn = $('btn-copy-results');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy results'; }, 1500);
    });
  });

  // Checkboxes → state + storage
  [
    ['opt-lazyload',   'lazyload',            SK.lazyload],
    ['opt-random',     'random',              SK.random],
    ['opt-reverse',    'reverse',             SK.reverse],
    ['opt-preserve',   'preserve',            SK.preserve],
    ['opt-deduplicate','deduplicate',         SK.deduplicate],
    ['opt-searchquery','handleAsSearchQuery', SK.handleAsSearchQuery],
    ['opt-newwindow',  'openInNewWindow',     SK.openInNewWindow],
    ['opt-precheck',   'preCheck',            SK.preCheck],
  ].forEach(([id, stateKey, storageKey]) => {
    $(id).addEventListener('change', e => {
      state[stateKey] = e.target.checked;
      save(storageKey, e.target.checked);
      if (stateKey === 'preserve') save(SK.urlList, e.target.checked ? state.urlList : '');
      if (stateKey === 'deduplicate') updateTabCount();
    });
  });

  $('tabGroupSelection')?.addEventListener('change', e => {
    state.selectedTabGroupId = Number(e.target.value);
    save(SK.selectedTabGroupId, state.selectedTabGroupId);
  });

  $('containerSelection')?.addEventListener('change', e => {
    state.selectedContainerId = e.target.value;
    save(SK.selectedContainerId, state.selectedContainerId);
  });
}

document.addEventListener('DOMContentLoaded', init);
