import Vue from "vue";
import VueRouter from "vue-router";
import Home from "@/views/Home.vue";
import store from "@/store";

import { NetworkRoutes } from "@/components/network/routes";
import { EC2Routes } from "@/components/EC2/routes";
import { MessagesRoutes } from "@/components/messages/routes";
import { ECSRoutes } from "@/components/ECS/routes";

Vue.use(VueRouter);

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
    meta: { hideSubHeader: true },
  },
  {
    path: "/changelog",
    name: "Changelog",
    component: () =>
      import(/* webpackChunkName: "changelog" */ "@/views/Changelog.vue"),
    meta: { title: "Changelog", hideSubHeader: true },
  },
  {
    path: "/security",
    name: "Security",
    component: () =>
      import(/* webpackChunkName: "security" */ "@/views/Security.vue"),
    meta: { title: "Security", hideSubHeader: true },
  },
  {
    path: "/about",
    name: "About",
    meta: { title: "Features", hideSubHeader: true },
    component: () =>
      import(/* webpackChunkName: "about" */ "@/views/About.vue"),
  },
  {
    path: "/contribute",
    name: "Contribute",
    component: () =>
      import(/* webpackChunkName: "contribute" */ "@/views/Contribute.vue"),
    meta: { title: "Contribute", hideSubHeader: true },
  },
  {
    path: "/home",
    name: "Main menu",
    component: () =>
      import(/* webpackChunkName: "main_menu" */ "@/components/MainMenu.vue"),
    meta: { title: "Main Menu", requiresLogin: true, hideRefresher: true },
  },
  ...NetworkRoutes,
  ...EC2Routes,
  ...MessagesRoutes,
  ...ECSRoutes,
  {
    path: "*",
    name: "Not Found",
    component: () =>
      import(/* webpackChunkName: "notFound" */ "@/views/404.vue"),
    meta: { title: "404", hideSubHeader: true },
  },
];

const router = new VueRouter({
  routes,
});

router.beforeEach((to, from, next) => {
  next();
  // if (to.meta.requiresLogin && !store.getters["sts/isLoggedIn"]) {
  //   store.commit("sts/routeAfterLogin", to);
  //   next("/login");
  // } else {
  //   next();
  // }
});

router.afterEach((to) => {
  if (to.meta.hideSubHeader === true) {
    store.commit("header/hideSubHeader");
  } else {
    store.commit("header/showSubHeader");
  }

  if (to.meta.hideRefresher === true) {
    store.commit("header/hideRefresher");
  } else {
    store.commit("header/showRefresher");
  }

  // Use next tick to handle router history correctly
  // see: https://github.com/vuejs/vue-router/issues/914#issuecomment-384477609
  Vue.nextTick(() => {
    document.title = to.meta.title ? `${to.meta.title} | Daintree` : "Daintree";

    if (
      store.getters["sts/isLoggedIn"] &&
      store.getters["sts/regions"].length === 0
    ) {
      store.commit("sts/showRegionsModal", true);
    }
  });
});

export default router;
