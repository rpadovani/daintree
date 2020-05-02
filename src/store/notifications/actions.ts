import {
  AppNotification,
  NotificationState,
} from "@/store/notifications/state";
import { ActionContext } from "vuex";

export const NotificationActions = {
  showAlert(
    context: ActionContext<NotificationState, any>,
    notification: AppNotification
  ) {
    context.commit("show", notification);
  },
  dismissAlertByKey(
    context: ActionContext<NotificationState, any>,
    key: string
  ) {
    context.commit("dismissByKey", key);
  },
  dismissAlertByResourceID(
    context: ActionContext<NotificationState, any>,
    resourceID: string
  ) {
    context.commit("dismissByResourceID", resourceID);
  },
};
