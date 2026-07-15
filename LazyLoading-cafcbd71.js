import { _ as _export_sfc } from "./assets/_plugin-vue_export-helper-8461c927.js";
import { d as createElementBlock, c as openBlock, k as createApp } from "./assets/vendor-df4776a1.js";
const _sfc_main = {
  methods: {
    init: () => {
      const url = window.location.hash.substring(1);
      let docTitle = url;
      try {
        const parsedUrl = new URL(url);
        let hostname = parsedUrl.hostname;
        if (hostname.startsWith("www.")) {
          hostname = hostname.substring(4);
        }
        let path = `${hostname}${parsedUrl.pathname}`;
        if (path.endsWith("/")) {
          path = path.substring(0, path.length - 1);
        }
        docTitle = path;
      } catch (e) {
        console.error(e);
      }
      document.title = `[${docTitle}]`;
      window.addEventListener(
        "focus",
        () => {
          window.location.replace(window.location.hash.substr(1));
        },
        false
      );
    }
  },
  beforeMount() {
    this.init();
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("div");
}
const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
createApp(App).mount("#app");
//# sourceMappingURL=LazyLoading-cafcbd71.js.map
