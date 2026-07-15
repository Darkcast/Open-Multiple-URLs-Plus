import { _ as _export_sfc } from "./assets/_plugin-vue_export-helper-8461c927.js";
import { r as reactive, b as browser, a as ref, o as onMounted, c as openBlock, d as createElementBlock, e as createBaseVNode, f as createTextVNode, t as toDisplayString, g as createCommentVNode, w as withDirectives, v as vModelSelect, F as Fragment, h as renderList, i as defineComponent, u as unref, j as createVNode, k as createApp } from "./assets/vendor-df4776a1.js";
import { N as NO_TAB_GROUP_ID, a as NO_CONTAINER_ID, l as loadTabGroups, b as loadContainers, g as getTabCount, c as NO_LAZY_LOAD_SCHEMES, h as hasContainerSupport } from "./assets/load-a81c33fb.js";
const browseraction = "";
var BrowserStorageKey = /* @__PURE__ */ ((BrowserStorageKey2) => {
  BrowserStorageKey2["urlList"] = "txt";
  BrowserStorageKey2["lazyload"] = "lazyload";
  BrowserStorageKey2["random"] = "random";
  BrowserStorageKey2["reverse"] = "reverse";
  BrowserStorageKey2["preserve"] = "preserve";
  BrowserStorageKey2["deduplicate"] = "deduplicate";
  BrowserStorageKey2["handleAsSearchQuery"] = "handleAsSearchQuery";
  BrowserStorageKey2["selectedTabGroupId"] = "selectedTabGroupId";
  BrowserStorageKey2["selectedContainerId"] = "selectedContainerId";
  return BrowserStorageKey2;
})(BrowserStorageKey || {});
const store = reactive({
  urlList: "",
  lazyLoadingChecked: false,
  loadInRandomOrderChecked: false,
  loadInReverseOrderChecked: false,
  preserveInputChecked: false,
  deduplicateURLsChecked: false,
  handleAsSearchQueryChecked: false,
  hasTabGroupSupport: false,
  tabGroups: [],
  selectedTabGroupId: NO_TAB_GROUP_ID,
  hasContainerSupport: false,
  containers: [],
  selectedContainerId: NO_CONTAINER_ID,
  setUrlList(value) {
    this.urlList = value;
    if (store.preserveInputChecked) {
      browser.storage.local.set({ [BrowserStorageKey.urlList]: value });
    }
  },
  setLazyLoadingChecked(value) {
    this.lazyLoadingChecked = value;
    browser.storage.local.set({ [BrowserStorageKey.lazyload]: value });
  },
  setLoadInRandomOrderChecked(value) {
    this.loadInRandomOrderChecked = value;
    browser.storage.local.set({ [BrowserStorageKey.random]: value });
  },
  setLoadInReverseOrderChecked(value) {
    this.loadInReverseOrderChecked = value;
    browser.storage.local.set({ [BrowserStorageKey.reverse]: value });
  },
  setPreserveInputChecked(value) {
    this.preserveInputChecked = value;
    browser.storage.local.set({ [BrowserStorageKey.preserve]: value });
    browser.storage.local.set({ [BrowserStorageKey.urlList]: value ? store.urlList : "" });
  },
  setDeduplicateURLsChecked(value) {
    this.deduplicateURLsChecked = value;
    browser.storage.local.set({ [BrowserStorageKey.deduplicate]: value });
  },
  setSelectedTabGroupId(value) {
    this.selectedTabGroupId = Number(value);
    browser.storage.local.set({ [BrowserStorageKey.selectedTabGroupId]: value });
  },
  setSelectedContainerId(value) {
    this.selectedContainerId = value;
    browser.storage.local.set({ [BrowserStorageKey.selectedContainerId]: value });
  },
  setHandleAsSearchQueryChecked(value) {
    this.handleAsSearchQueryChecked = value;
    browser.storage.local.set({ [BrowserStorageKey.handleAsSearchQuery]: value });
  }
});
const _sfc_main$3 = {
  computed: {
    store() {
      return store;
    }
  },
  setup() {
    const urlTextArea = ref(null);
    onMounted(() => {
      if (urlTextArea.value) {
        urlTextArea.value.select();
      }
    });
    return {
      urlTextArea
    };
  },
  methods: {
    handleUrlListInput(event) {
      store.setUrlList((event == null ? void 0 : event.target).value);
    }
  }
};
const _hoisted_1$3 = { id: "url-list-input" };
const _hoisted_2$2 = ["value"];
function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("section", _hoisted_1$3, [
    _cache[1] || (_cache[1] = createBaseVNode("label", { for: "urls" }, "List of URLs / Text to extract URLs from:", -1)),
    createBaseVNode("textarea", {
      ref: "urlTextArea",
      id: "urls",
      wrap: "soft",
      tabindex: "1",
      value: $options.store.urlList,
      onInput: _cache[0] || (_cache[0] = (...args) => $options.handleUrlListInput && $options.handleUrlListInput(...args))
    }, null, 40, _hoisted_2$2)
  ]);
}
const UrlListInput = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$1]]);
const extractURLs = (text) => {
  const seen = new Set();
  const urls = [];
  let urlmatcharr;
  const urlregex = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()[\]{};:'".,<>?«»“”‘’]))/gi;

function normalizeURL(raw) {
  try {
    const u = new URL(raw.trim());

    // Detect if it's a file path (has extension)
    const pathParts = u.pathname.split("/");
    const lastPart = pathParts[pathParts.length - 1];
    const isFile = /\.[a-z0-9]+$/i.test(lastPart); // Matches .aspx, .html, .jpg, etc.

    // Add trailing slash only for directory-style URLs
    if (!isFile && !u.pathname.endsWith("/")) {
      u.pathname += "/";
    }

    return u.href;
  } catch (e) {
    return raw.trim(); // fallback
  }
}

  while ((urlmatcharr = urlregex.exec(text)) !== null) {
    const match = urlmatcharr[0];
    const normalized = normalizeURL(match);

    if (!seen.has(normalized)) {
      seen.add(normalized);
      urls.push(normalized);
    }
  }

  return urls.join("\n");
};

const _sfc_main$2 = {
  data() {
    return {
      selectedTabGroupId: store.selectedTabGroupId,
      selectedContainerId: store.selectedContainerId
    };
  },
  methods: {
    openURLs() {
      const message = {
        action: "loadSites",
        text: store.urlList,
        lazyloading: store.lazyLoadingChecked,
        random: store.loadInRandomOrderChecked,
        reverse: store.loadInReverseOrderChecked,
        deduplicate: store.deduplicateURLsChecked,
        handleAsSearchQuery: store.handleAsSearchQueryChecked,
        selectedTabGroupId: this.selectedTabGroupId,
        selectedContainerId: this.selectedContainerId
      };
      browser.runtime.sendMessage(message).then(() => {
        loadTabGroups().then((tabGroups) => {
          store.tabGroups = tabGroups;
        });
        loadContainers().then((containers) => {
          store.containers = containers;
        });
      });
    },
    setUrlListInputData() {
      store.setUrlList(extractURLs(store.urlList));
    },
    setTabGroupSelection() {
      this.$nextTick(() => {
        store.setSelectedTabGroupId(this.selectedTabGroupId);
      });
    },
    setContainerSelection() {
      this.$nextTick(() => {
        store.setSelectedContainerId(this.selectedContainerId);
      });
    }
  },
  computed: {
    tabCount: function() {
      return getTabCount(store.urlList, store.deduplicateURLsChecked);
    },
    tabGroupsSupported: function() {
      return store.hasTabGroupSupport;
    },
    tabGroups: function() {
      return store.tabGroups;
    },
    containersSupported: function() {
      return store.hasContainerSupport;
    },
    containers: function() {
      return store.containers;
    }
  }
};
const _hoisted_1$2 = { id: "action-bar" };
const _hoisted_2$1 = { key: 0 };
const _hoisted_3$1 = ["value"];
const _hoisted_4$1 = ["value"];
const _hoisted_5$1 = {
  key: 2,
  id: "tabcount",
  "aria-label": "Opening many URLs at once may lead to long wait times or crash your browser.",
  "data-microtip-position": "bottom",
  "data-microtip-size": "medium",
  role: "tooltip"
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("section", _hoisted_1$2, [
    createBaseVNode("button", {
      id: "extract",
      tabindex: "6",
      onClick: _cache[0] || (_cache[0] = (...args) => $options.setUrlListInputData && $options.setUrlListInputData(...args))
    }, "Extract URLs from text"),
    createBaseVNode("button", {
      id: "open",
      tabindex: "2",
      onClick: _cache[1] || (_cache[1] = (...args) => $options.openURLs && $options.openURLs(...args))
    }, [
      createBaseVNode("strong", null, [
        _cache[6] || (_cache[6] = createTextVNode(" Open URLs ")),
        $options.tabCount > 0 ? (openBlock(), createElementBlock("span", _hoisted_2$1, "(" + toDisplayString($options.tabCount) + ")", 1)) : createCommentVNode("", true)
      ])
    ]),
    $options.tabGroupsSupported ? withDirectives((openBlock(), createElementBlock("select", {
      key: 0,
      id: "tabGroupSelection",
      "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.selectedTabGroupId = $event),
      onChange: _cache[3] || (_cache[3] = (...args) => $options.setTabGroupSelection && $options.setTabGroupSelection(...args))
    }, [
      (openBlock(true), createElementBlock(Fragment, null, renderList($options.tabGroups, (group) => {
        return openBlock(), createElementBlock("option", {
          key: group.id,
          value: group.id
        }, toDisplayString(group.title), 9, _hoisted_3$1);
      }), 128))
    ], 544)), [
      [vModelSelect, $data.selectedTabGroupId]
    ]) : createCommentVNode("", true),
    $options.containersSupported ? withDirectives((openBlock(), createElementBlock("select", {
      key: 1,
      id: "containerSelection",
      "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $data.selectedContainerId = $event),
      onChange: _cache[5] || (_cache[5] = (...args) => $options.setContainerSelection && $options.setContainerSelection(...args))
    }, [
      (openBlock(true), createElementBlock(Fragment, null, renderList($options.containers, (c) => {
        return openBlock(), createElementBlock("option", {
          key: c.cookieStoreId,
          value: c.cookieStoreId
        }, toDisplayString(c.title), 9, _hoisted_4$1);
      }), 128))
    ], 544)), [
      [vModelSelect, $data.selectedContainerId]
    ]) : createCommentVNode("", true),
    $options.tabCount >= 25 ? (openBlock(), createElementBlock("span", _hoisted_5$1, " ⚠ ")) : createCommentVNode("", true)
  ]);
}
const ActionBar = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render]]);
const _hoisted_1$1 = { id: "option-bar-hwrapper" };
const _hoisted_2 = { class: "checkbox" };
const _hoisted_3 = ["checked"];
const _hoisted_4 = ["aria-label"];
const _hoisted_5 = { class: "checkbox" };
const _hoisted_6 = ["checked"];
const _hoisted_7 = { class: "checkbox" };
const _hoisted_8 = ["checked"];
const _hoisted_9 = { class: "checkbox" };
const _hoisted_10 = ["checked"];
const _hoisted_11 = { class: "checkbox" };
const _hoisted_12 = ["checked"];
const _hoisted_13 = { class: "checkbox" };
const _hoisted_14 = ["checked"];
const __default__ = {
  methods: {
    checkLazyLoading(event) {
      this.$nextTick(() => {
        store.setLazyLoadingChecked((event == null ? void 0 : event.target).checked);
      });
    },
    checkLoadInRandomOrder(event) {
      this.$nextTick(() => {
        store.setLoadInRandomOrderChecked((event == null ? void 0 : event.target).checked);
      });
    },
    checkLoadInReverseOrder(event) {
      this.$nextTick(() => {
        store.setLoadInReverseOrderChecked((event == null ? void 0 : event.target).checked);
      });
    },
    checkPreserveInput(event) {
      this.$nextTick(() => {
        store.setPreserveInputChecked((event == null ? void 0 : event.target).checked);
      });
    },
    checkDeduplicateURLs(event) {
      this.$nextTick(() => {
        store.setDeduplicateURLsChecked((event == null ? void 0 : event.target).checked);
      });
    },
    checkHandleAsSearchQuery(event) {
      this.$nextTick(() => {
        store.setHandleAsSearchQueryChecked((event == null ? void 0 : event.target).checked);
      });
    }
  }
};
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  ...__default__,
  __name: "OptionBar",
  setup(__props) {
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock(Fragment, null, [
        createBaseVNode("section", _hoisted_1$1, [
          createBaseVNode("section", null, [
            createBaseVNode("label", _hoisted_2, [
              createBaseVNode("input", {
                type: "checkbox",
                id: "lazyLoad",
                tabindex: "3",
                checked: unref(store).lazyLoadingChecked,
                onChange: _cache[0] || (_cache[0] = //@ts-ignore
                (...args) => _ctx.checkLazyLoading && _ctx.checkLazyLoading(...args))
              }, null, 40, _hoisted_3),
              _cache[6] || (_cache[6] = createTextVNode(" Do not load tabs until selected  ")),
              createBaseVNode("span", {
                "aria-label": "Search queries and the following URL schemes are not supported: " + unref(NO_LAZY_LOAD_SCHEMES).join(", "),
                "data-microtip-position": "bottom",
                "data-microtip-size": "large",
                role: "tooltip"
              }, " ⓘ ", 8, _hoisted_4)
            ]),
            createBaseVNode("label", _hoisted_5, [
              createBaseVNode("input", {
                type: "checkbox",
                id: "random",
                tabindex: "4",
                checked: unref(store).loadInRandomOrderChecked,
                onChange: _cache[1] || (_cache[1] = //@ts-ignore
                (...args) => _ctx.checkLoadInRandomOrder && _ctx.checkLoadInRandomOrder(...args))
              }, null, 40, _hoisted_6),
              _cache[7] || (_cache[7] = createTextVNode(" Load in random order"))
            ]),
            createBaseVNode("label", _hoisted_7, [
              createBaseVNode("input", {
                type: "checkbox",
                id: "reverse",
                tabindex: "4",
                checked: unref(store).loadInReverseOrderChecked,
                onChange: _cache[2] || (_cache[2] = //@ts-ignore
                (...args) => _ctx.checkLoadInReverseOrder && _ctx.checkLoadInReverseOrder(...args))
              }, null, 40, _hoisted_8),
              _cache[8] || (_cache[8] = createTextVNode(" Load in reverse order"))
            ])
          ]),
          createBaseVNode("section", null, [
            createBaseVNode("label", _hoisted_9, [
              createBaseVNode("input", {
                type: "checkbox",
                id: "deduplicate",
                tabindex: "5",
                checked: unref(store).deduplicateURLsChecked,
                onChange: _cache[3] || (_cache[3] = //@ts-ignore
                (...args) => _ctx.checkDeduplicateURLs && _ctx.checkDeduplicateURLs(...args))
              }, null, 40, _hoisted_10),
              _cache[9] || (_cache[9] = createTextVNode(" Ignore duplicate URLs"))
            ]),
            createBaseVNode("label", _hoisted_11, [
              createBaseVNode("input", {
                type: "checkbox",
                id: "searchquery",
                tabindex: "6",
                checked: unref(store).handleAsSearchQueryChecked,
                onChange: _cache[4] || (_cache[4] = //@ts-ignore
                (...args) => _ctx.checkHandleAsSearchQuery && _ctx.checkHandleAsSearchQuery(...args))
              }, null, 40, _hoisted_12),
              _cache[10] || (_cache[10] = createTextVNode(" Handle Non-URLs as search queries"))
            ])
          ])
        ]),
        createBaseVNode("section", null, [
          createBaseVNode("label", _hoisted_13, [
            createBaseVNode("input", {
              type: "checkbox",
              id: "preserve",
              tabindex: "5",
              checked: unref(store).preserveInputChecked,
              onChange: _cache[5] || (_cache[5] = //@ts-ignore
              (...args) => _ctx.checkPreserveInput && _ctx.checkPreserveInput(...args))
            }, null, 40, _hoisted_14),
            _cache[11] || (_cache[11] = createTextVNode(" Preserve input"))
          ])
        ])
      ], 64);
    };
  }
});
const _hoisted_1 = { key: 0 };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "BrowserAction",
  setup(__props) {
    const isStoredValuesLoaded = ref(false);
    Promise.all([
      browser.storage.local.get(Object.values(BrowserStorageKey)),
      loadTabGroups(),
      hasContainerSupport(),
      loadContainers()
    ]).then((data) => {
      var _a, _b;
      store.urlList = String(data[0][BrowserStorageKey.urlList] ?? "");
      store.lazyLoadingChecked = Boolean(data[0][BrowserStorageKey.lazyload]) ?? false;
      store.loadInRandomOrderChecked = Boolean(data[0][BrowserStorageKey.random]) ?? false;
      store.loadInReverseOrderChecked = Boolean(data[0][BrowserStorageKey.reverse]) ?? false;
      store.preserveInputChecked = Boolean(data[0][BrowserStorageKey.preserve]) ?? false;
      store.deduplicateURLsChecked = Boolean(data[0][BrowserStorageKey.deduplicate]) ?? false;
      store.handleAsSearchQueryChecked = Boolean(data[0][BrowserStorageKey.handleAsSearchQuery]) ?? false;
      store.hasTabGroupSupport = Boolean(browser.tabGroups) ?? false;
      store.tabGroups = data[1];
      store.selectedTabGroupId = ((_a = store.tabGroups.find(
        (group) => group.id === Number(data[0][BrowserStorageKey.selectedTabGroupId])
      )) == null ? void 0 : _a.id) ?? NO_TAB_GROUP_ID;
      store.hasContainerSupport = data[2];
      store.containers = data[3];
      store.selectedContainerId = ((_b = store.containers.find((c) => c.cookieStoreId === data[0][BrowserStorageKey.selectedContainerId])) == null ? void 0 : _b.cookieStoreId) ?? NO_CONTAINER_ID;
      isStoredValuesLoaded.value = true;
    });
    return (_ctx, _cache) => {
      return isStoredValuesLoaded.value ? (openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(UrlListInput),
        createVNode(ActionBar),
        _cache[0] || (_cache[0] = createBaseVNode("hr", null, null, -1)),
        createVNode(_sfc_main$1)
      ])) : createCommentVNode("", true);
    };
  }
});
createApp(_sfc_main).mount("#app");
//# sourceMappingURL=BrowserAction-4bd0e622.js.map
