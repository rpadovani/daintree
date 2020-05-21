import Vue from "vue";
import App from "./App.vue";
import store from "./store";
import router from "./router";

import "@/assets/css/flags.css";
import "@gitlab/ui/dist/index.css";
import "@gitlab/ui/dist/utility_classes.css";
import "highlight.js/styles/github.css";

Vue.config.productionTip = true;

new Vue({
  store,
  router,
  render: (h) => h(App),
}).$mount("#app");
