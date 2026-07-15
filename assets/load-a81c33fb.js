import { b as browser } from "./vendor-df4776a1.js";

const NO_TAB_GROUP_ID = -1;
const NO_TAB_GROUP_TITLE = "No Tab Group";
const NEW_TAB_GROUP_ID = -2;
const NEW_TAB_GROUP_TITLE = "New Tab Group";

const loadTabGroups = async () => {
  var _a;
  const tabGroups = await (((_a = browser.tabGroups) == null ? void 0 : _a.query({})) || Promise.resolve([]));
  return [
    { id: NO_TAB_GROUP_ID, title: NO_TAB_GROUP_TITLE },
    { id: NEW_TAB_GROUP_ID, title: NEW_TAB_GROUP_TITLE },
    ...tabGroups.map((group) => ({
      id: group.id,
      title: `${group.title}${group.title ? " " : ""}(${group.color})`
    }))
  ];
};

const CONTAINER_COLORS = ["blue", "turquoise", "green", "yellow", "orange", "red", "pink", "purple"];
const NO_CONTAINER_ID = "NO_CONTAINER_ID";
const NO_CONTAINER_TITLE = "No Container";
const NEW_CONTAINER_ID = "NEW_CONTAINER_ID";
const NEW_CONTAINER_TITLE = "New Container";

const hasContainerSupport = async () => {
  if (!browser.contextualIdentities) return false;
  try {
    await browser.contextualIdentities.query({});
    return true;
  } catch (e) {
    console.info("Error querying containers, the browser feature may be disabled:", e);
    return false;
  }
};

const loadContainers = async () => {
  var _a;
  const containers = await hasContainerSupport()
    ? (await (((_a = browser.contextualIdentities) == null ? void 0 : _a.query({})) || Promise.resolve([]))).map((ci) => ({
        cookieStoreId: ci.cookieStoreId,
        title: `${ci.name}${ci.name ? " " : ""}(${ci.color})`
      }))
    : [];
  return [
    { cookieStoreId: NO_CONTAINER_ID, title: NO_CONTAINER_TITLE },
    { cookieStoreId: NEW_CONTAINER_ID, title: NEW_CONTAINER_TITLE },
    ...containers
  ];
};

const NO_LAZY_LOAD_SCHEMES = [
  "file",
  "view-source",
  "moz-extension",
  "chrome",
  "chrome-extension",
  "edge",
  "extension"
];

const getSchema = (url) => {
  return hasValidSchema(url) ? new URL(url).protocol.replace(":", "") : "";
};

const hasValidSchema = (url) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

const canLazyLoad = (url) => {
  return NO_LAZY_LOAD_SCHEMES.indexOf(getSchema(url)) === -1;
};

const shuffle = (a) => {
  let j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
};

const splitInputLines = (text, deduplicate) => {
  const urls = text.split(/\r\n?|\n/g).filter((line) => line.trim() !== "");
  return deduplicate ? Array.from(new Set(urls)) : urls;
};


const waitForTabLoad = (tabId, timeoutMs) => {
  return new Promise((resolve) => {
    let resolved = false;

    const onUpdated = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === "complete" && !resolved) {
        resolved = true;
        browser.tabs.onUpdated.removeListener(onUpdated);
        resolve("loaded");
      }
    };

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        browser.tabs.onUpdated.removeListener(onUpdated);
        resolve("timeout");
      }
    }, timeoutMs);

    browser.tabs.onUpdated.addListener(onUpdated);
  });
};

const OPEN_CONCURRENCY = 5;
const LOAD_TIMEOUT_MS  = 10000;

// opts.isCancelled  — () => bool  checked before each tab; stops the run when true
// opts.onProgress   — ({ done, total, skipped }) called after each URL is processed
const loadSites = async (
  text,
  lazyloading,
  random,
  reverse,
  deduplicate,
  handleAsSearchQuery,
  selectedTabGroupId = void 0,
  selectedContainerId = void 0,
  openInNewWindow = false,
  { isCancelled = null, onProgress = null } = {}
) => {
  let lines = splitInputLines(text, deduplicate);
  if (reverse) lines = lines.reverse();
  if (random)  lines = shuffle(lines);

  if (selectedContainerId === NEW_CONTAINER_ID) {
    selectedContainerId = (await browser.contextualIdentities.create({
      name: "OMU " + new Date().toLocaleString(),
      color: CONTAINER_COLORS[Math.floor(Math.random() * CONTAINER_COLORS.length)],
      icon: "circle"
    })).cookieStoreId;
  }

  let targetWindowId = void 0;
  if (openInNewWindow) {
    try {
      const win = await browser.windows.create({ focused: true, state: "normal" });
      targetWindowId = win.id;
      if (win.tabs && win.tabs.length > 0) {
        const blankTabId = win.tabs[0].id;
        setTimeout(() => browser.tabs.remove(blankTabId).catch(() => {}), 300);
      }
    } catch (e) {
      console.warn("[!] Failed to create new window:", e);
    }
  }

  const createdTabs = [];
  let nextIdx = 0;
  let done    = 0;

  const worker = async () => {
    while (nextIdx < lines.length) {
      if (isCancelled && isCancelled()) break;

      const i = nextIdx++;
      const rawLine = lines[i].trim();
      if (!rawLine) continue;

      const hasSchema     = hasValidSchema(rawLine);
      const isSearchQuery = !hasSchema && handleAsSearchQuery;
      let url = rawLine;
      if (!hasSchema && !isSearchQuery) url = "http://" + url;

      if (lazyloading && canLazyLoad(url) && !isSearchQuery) {
        url = browser.runtime.getURL("lazyloading.html#") + url;
      }

      const tabProps = {
        url: isSearchQuery ? "about:blank" : url,
        active: false,
      };
      if (targetWindowId != null)  tabProps.windowId = targetWindowId;
      if (selectedContainerId && selectedContainerId !== NO_CONTAINER_ID) {
        tabProps.cookieStoreId = selectedContainerId;
      }

      try {
        const tab = await browser.tabs.create(tabProps);
        createdTabs.push(tab);
        if (isSearchQuery) await browser.search.query({ text: url, tabId: tab.id });
        await waitForTabLoad(tab.id, LOAD_TIMEOUT_MS);
      } catch (err) {
        console.error("[x] Failed to create tab:", tabProps, err);
      }

      done++;
      if (onProgress) onProgress({ done, total: lines.length, skipped: 0 });
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(OPEN_CONCURRENCY, lines.length) }, worker)
  );

  if (selectedTabGroupId != null && selectedTabGroupId !== NO_TAB_GROUP_ID) {
    try {
      await browser.tabs.group({
        tabIds: createdTabs.map((tab) => tab.id || -1),
        groupId: selectedTabGroupId === NEW_TAB_GROUP_ID ? void 0 : selectedTabGroupId
      });
    } catch (e) {
      console.warn("[!] Failed to group tabs:", e);
    }
  }
};

const getTabCount = (text, deduplicate) => {
  return text ? splitInputLines(text, deduplicate).length : 0;
};

export {
  NO_TAB_GROUP_ID as N,
  NO_CONTAINER_ID as a,
  loadContainers as b,
  NO_LAZY_LOAD_SCHEMES as c,
  loadSites as d,
  getTabCount as g,
  hasContainerSupport as h,
  loadTabGroups as l
};
