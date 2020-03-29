import { GetterTree } from "vuex";
import { NotificationState } from "@/store/notifications/state";

export const NotificationGetters = {
  getNotifications: function(state) {
    return state.notifications;
  }
} as GetterTree<NotificationState, any>;
