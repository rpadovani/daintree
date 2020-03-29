import Vue from "vue";
import { BootstrapVue } from "bootstrap-vue";
import App from "./App.vue";
import store from "./store";
import router from "./router";

import "flag-icon-css/css/flag-icon.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-vue/dist/bootstrap-vue.css";
import "@gitlab/ui/dist/index.css";
import "highlight.js/styles/github.css";

Vue.config.productionTip = true;

Vue.use(BootstrapVue);

new Vue({
  store,
  router,
  render: h => h(App)
}).$mount("#app");
