# Open Multiple URLs Plus

A heavily modified version of [Open Multiple URLs](https://github.com/htrinter/Open-Multiple-URLs) rebuilt for large-scale URL testing workflows. The main use case is checking whether a list of URLs (100+) is alive before opening them as tabs.

---

## Features

### URL Health Check
Paste a list of URLs and click **Check URLs** to probe each one without opening a single tab. Results stream in live with color-coded status badges:

| Badge color | Meaning |
|---|---|
| Green | 2xx / 3xx — server responded OK or redirected |
| Orange | 4xx / 5xx — server is up but the resource is broken (e.g. 404) |
| Purple | Timeout — server did not respond within 8 seconds |
| Red | Dead — connection failed, DNS error, or unreachable host |

After checking you can:
- **Open alive (N)** — opens only the URLs that passed (2xx/3xx)
- **Copy results** — copies a TSV of status, URL, and response time to clipboard

### Skip Unreachable URLs Before Opening
Enable **Skip unreachable URLs before opening** in the options. When you click **Open URLs** the extension first probes each URL from the popup (not the background), filters out anything that doesn't respond, then opens only the live ones. The button shows live progress: `Checking 45/99 · 12 skipped`.

> This check runs in the popup page rather than the background service worker to avoid corporate/VPN proxy servers returning fake `200 OK` responses for unreachable hosts.

### Concurrency-Safe Tab Opening
Tabs are opened in a pool of **5 concurrent slots** — fast enough to handle 100+ URLs without overwhelming the browser. Each slot waits up to 10 seconds for a tab to finish loading before taking the next URL.

### Cancel
A **Cancel** button appears next to Open URLs while any operation is in progress (checking or opening). It stops both the popup pre-check phase and any ongoing tab opening in the background.

### Extract URLs from Text
Paste arbitrary text — emails, logs, documentation — and click **Extract URLs** to pull out only the URLs. Handles:
- Full URLs with schema (`https://`, `http://`)
- URLs with `www.` prefix
- Bare hostnames with no schema (`venafi-node-01.internal.example.com`)

### Open in New Window
Check **Open in new window** to send all tabs to a fresh browser window instead of your current one. Useful for keeping monitoring or audit sessions separate.

### All Original Options Preserved
| Option | Description |
|---|---|
| Lazy load tabs | Tabs don't load until you select them |
| Random order | Opens URLs in a shuffled order |
| Reverse order | Opens URLs bottom-to-top |
| Remove duplicates | Ignores duplicate lines before opening |
| Non-URLs as searches | Lines without a URL schema are sent as browser searches |
| Preserve input | Keeps the URL list in the textarea after opening |
| Tab group | Assign opened tabs to an existing or new tab group |
| Container | Open tabs in a Firefox container (Firefox only) |

---

## Recommended Workflow for Large URL Lists

```
Paste URLs → Check URLs → Open alive (N)
```

1. Paste your list (one URL per line)
2. Click **Check URLs** — waits for all probes to complete
3. Review the summary (`✓ 87 alive  ! 3 reachable  ⏱ 2 timeout  ✗ 7 dead`)
4. Click **Open alive (87)** — only the working URLs open as tabs

For a one-click version: enable **Skip unreachable URLs before opening** and just click **Open URLs**. The pre-check runs automatically.

---

## URL Format

One URL per line. Supported formats:

```
https://example.com
http://example.com/path/to/page
example.com                          ← gets http:// prepended automatically
subdomain.internal.example.com       ← bare hostnames are handled
api.service.io:8080/health
```

---

## Permissions

| Permission | Why it's needed |
|---|---|
| `storage` | Saves your options and URL list between sessions |
| `tabGroups` | Assigns tabs to Chrome tab groups |
| `search` | Opens non-URL lines as browser searches |
| `windows` | Creates a new browser window when "Open in new window" is checked |
| `host_permissions: <all_urls>` | Allows the health check to probe any URL via `fetch()` |

---

## Installation (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select this folder

To reload after code changes: click the refresh icon on the extension card in `chrome://extensions`.

---

## Files

```
background.js              Service worker — receives messages, opens tabs
browseraction.html         Popup HTML
popup.js                   All popup logic (health check, URL opening, options)
popup.css                  Styles (light + dark theme)
assets/load-a81c33fb.js    Core tab-opening engine (concurrency pool, new window)
manifest.json              Extension manifest (MV3)
lazyloading.html           Wrapper page for lazy-loaded tabs
```

---

## Based On

[Open Multiple URLs](https://github.com/htrinter/Open-Multiple-URLs) by htrinter — original MIT-licensed extension. This fork rewrites the popup UI, adds URL health checking, pre-open filtering, concurrency-safe batch opening, and a cancel mechanism.
