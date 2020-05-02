import Vue from "vue";
import App from "./App.vue";
import store from "./store";
import router from "./router";

import "flag-icon-css/css/flag-icon.css";
import "@gitlab/ui/dist/index.css";
import "highlight.js/styles/github.css";

Vue.config.productionTip = true;

new Vue({
  store,
  router,
  render: (h) => h(App),
}).$mount("#app");
