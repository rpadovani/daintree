import Vue from "vue";
import VueRouter from "vue-router";
import Home from "@/views/Home.vue";
import store from "@/store";

import { NetworkRoutes } from "@/components/network/routes";
import { EC2Routes } from "@/components/EC2/routes";
import { MessagesRoutes } from "@/components/messages/routes";

Vue.use(VueRouter);

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home
  },
  {
    path: "/login",
    name: "Login",
    component: () =>
      import(/* webpackChunkName: "login" */ "@/components/Login.vue"),
    meta: { title: "Login" }
  },
  {
    path: "/changelog",
    name: "Changelog",
    component: () =>
      import(/* webpackChunkName: "changelog" */ "@/views/Changelog.vue"),
    meta: { title: "Changelog" }
  },
  {
    path: "/security",
    name: "Security",
    component: () =>
      import(/* webpackChunkName: "security" */ "@/views/Security.vue"),
    meta: { title: "Security" }
  },
  {
    path: "/cognito_callback",
    name: "Cognito Callback",
    component: () =>
      import(
        /* webpackChunkName: "cognito_callback" */ "@/components/CognitoCallback.vue"
      )
  },
  {
    path: "/about",
    name: "About",
    component: () => import(/* webpackChunkName: "about" */ "@/views/About.vue")
  },
  {
    path: "/oauth_instructions",
    name: "OAuth Instruction",
    component: () =>
      import(/* webpackChunkName: "oauth_instruction" */ "@/views/OAuth.vue"),
    meta: { title: "OAuth instructions" }
  },
  {
    path: "/contribute",
    name: "Contribute",
    component: () =>
      import(/* webpackChunkName: "contribute" */ "@/views/Contribute.vue"),
    meta: { title: "Contribute" }
  },
  {
    path: "/home",
    name: "Main menu",
    component: () =>
      import(/* webpackChunkName: "main_menu" */ "@/components/MainMenu.vue"),
    meta: { title: "Main Menu", requiresLogin: true }
  },
  ...NetworkRoutes,
  ...EC2Routes,
  ...MessagesRoutes,
  {
    path: "*",
    name: "Not Found",
    component: () =>
      import(/* webpackChunkName: "notFound" */ "@/views/404.vue"),
    meta: { title: "404" }
  }
];

const router = new VueRouter({
  routes
});

router.beforeEach((to, from, next) => {
  if (to.meta.requiresLogin && !store.getters["sts/isLoggedIn"]) {
    store.commit("sts/routeAfterLogin", to);
    next("/login");
  } else {
    next();
  }
});

router.afterEach((to, from) => {
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
