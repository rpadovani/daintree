import Vue from "vue";
import Vuex from "vuex";
import { STSMutations } from "@/store/sts/mutations";
import { STSGetters } from "@/store/sts/getters";
import { STSState } from "@/store/sts/state";
import { NotificationState } from "@/store/notifications/state";
import { NotificationMutations } from "@/store/notifications/mutations";
import { NotificationGetters } from "@/store/notifications/getters";
import { NotificationActions } from "@/store/notifications/actions";
import { STSActions } from "@/store/sts/actions";

Vue.use(Vuex);
export default new Vuex.Store({
  modules: {
    sts: {
      namespaced: true,
      state: new STSState(),
      mutations: STSMutations,
      getters: STSGetters,
      actions: STSActions,
    },
    notifications: {
      namespaced: true,
      state: new NotificationState(),
      mutations: NotificationMutations,
      getters: NotificationGetters,
      actions: NotificationActions,
    },
  },
});
