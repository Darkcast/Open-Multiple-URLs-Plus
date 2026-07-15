import { b as browser } from "./assets/vendor-df4776a1.js";
import { d as loadSites } from "./assets/load-a81c33fb.js";

// Module-level flag; stays alive as long as the service worker is running.
// The service worker stays alive while loadSites is awaiting, so this is safe.
let cancelRequested = false;

// Tracks the in-flight "opening" batch so a closed-and-reopened popup can
// resync its progress UI instead of losing track of an ongoing operation.
let activeOpen = null; // { total, done, skipped } | null

// Badge updates are cosmetic — never let a badge API failure abort tab opening.
function clearBadge() {
  try { browser.action.setBadgeText({ text: "" }).catch(() => {}); } catch {}
}

function updateBadge(done, total) {
  try {
    browser.action.setBadgeText({ text: `${done}/${total}` }).catch(() => {});
    browser.action.setBadgeBackgroundColor({ color: "#3b82f6" }).catch(() => {});
  } catch {}
}

browser.runtime.onMessage.addListener(async (message) => {
  if (message.action === "loadSites") {
    cancelRequested = false;
    activeOpen = { total: 0, done: 0, skipped: 0 };
    try {
      return await loadSites(
        message.text,
        message.lazyloading,
        message.random,
        message.reverse,
        message.deduplicate,
        message.handleAsSearchQuery,
        message.selectedTabGroupId,
        message.selectedContainerId,
        message.openInNewWindow ?? false,
        {
          isCancelled: () => cancelRequested,
          onProgress: (info) => {
            activeOpen = { total: info.total, done: info.done, skipped: info.skipped ?? 0 };
            updateBadge(info.done, info.total);
            // Popup may be closed; ignore the error if nobody is listening.
            browser.runtime.sendMessage({ action: "loadProgress", ...info }).catch(() => {});
          },
        }
      );
    } finally {
      activeOpen = null;
      clearBadge();
    }
  }

  if (message.action === "cancelLoad") {
    cancelRequested = true;
    return true;
  }

  // Lets a freshly (re)opened popup ask "is a batch already running?" so it
  // can restore the busy UI instead of showing the idle buttons.
  if (message.action === "getOpenStatus") {
    return activeOpen;
  }

  return false;
});
