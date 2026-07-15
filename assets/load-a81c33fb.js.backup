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
const CONTAINER_COLORS = [
  "blue",
  "turquoise",
  "green",
  "yellow",
  "orange",
  "red",
  "pink",
  "purple"
];
const NO_CONTAINER_ID = "NO_CONTAINER_ID";
const NO_CONTAINER_TITLE = "No Container";
const NEW_CONTAINER_ID = "NEW_CONTAINER_ID";
const NEW_CONTAINER_TITLE = "New Container";
const hasContainerSupport = async () => {
  if (!browser.contextualIdentities) {
    return false;
  } else {
    try {
      await browser.contextualIdentities.query({});
      return true;
    } catch (e) {
      console.info("Error querying containers, the browser feature may be disabled:", e);
      return false;
    }
  }
};
const loadContainers = async () => {
  var _a;
  const containers = await hasContainerSupport() ? (await (((_a = browser.contextualIdentities) == null ? void 0 : _a.query({})) || Promise.resolve([]))).map((ci) => ({
    cookieStoreId: ci.cookieStoreId,
    title: `${ci.name}${ci.name ? " " : ""}(${ci.color})`
  })) : [];
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
  const urlLineSplitRegex = /\r\n?|\n/g;
  const urls = text.split(urlLineSplitRegex).filter((line) => line.trim() !== "");
  return deduplicate ? Array.from(new Set(urls)) : urls;
};
const loadSites = async (text, lazyloading, random, reverse, deduplicate, handleAsSearchQuery, selectedTabGroupId = void 0, selectedContainerId = void 0) => {
  var _a, _b;
  let lines = splitInputLines(text, deduplicate);
  if (reverse) {
    lines = lines.reverse();
  }
  if (random) {
    lines = shuffle(lines);
  }
  if (selectedContainerId === NEW_CONTAINER_ID) {
    selectedContainerId = (await browser.contextualIdentities.create({
      name: "OMU " + (/* @__PURE__ */ new Date()).toLocaleString(),
      color: CONTAINER_COLORS[Math.floor(Math.random() * CONTAINER_COLORS.length)],
      icon: "circle"
    })).cookieStoreId;
  }
  const createdTabs = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") {
      continue;
    }
    const hasSchema = hasValidSchema(line);
    const isSearchQuery = !hasSchema && handleAsSearchQuery;
    let url = line;
    if (!hasSchema && !isSearchQuery) {
      url = "http://" + url;
    }
    if (lazyloading && canLazyLoad(url) && !isSearchQuery) {
      url = browser.runtime.getURL("lazyloading.html#") + url;
    }
    const tabCreateProperties = {
      url: isSearchQuery ? "about:blank" : url,
      active: false
    };
    if (selectedContainerId != null && selectedContainerId !== NO_CONTAINER_ID) {
      tabCreateProperties.cookieStoreId = selectedContainerId;
    }
    try {
      const createdTab = await browser.tabs.create(tabCreateProperties);
      createdTabs.push(createdTab);
      if (isSearchQuery) {
        await browser.search.query({ text: url, tabId: createdTab.id });
      }
    } catch (error) {
      console.error("Failed to create tab", tabCreateProperties, error);
    }
  }
  if (selectedTabGroupId != null && selectedTabGroupId !== NO_TAB_GROUP_ID) {
    await ((_b = (_a = browser.tabs).group) == null ? void 0 : _b.call(_a, {
      tabIds: createdTabs.map((tab) => tab.id || -1),
      groupId: selectedTabGroupId === NEW_TAB_GROUP_ID ? void 0 : selectedTabGroupId
    }));
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
//# sourceMappingURL=load-a81c33fb.js.map
