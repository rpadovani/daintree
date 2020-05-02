import { MutationTree } from "vuex";
import {
  AppNotification,
  NotificationState,
} from "@/store/notifications/state";

export const NotificationMutations = {
  show(state: NotificationState, notification: AppNotification) {
    state.notifications.push(notification);
  },

  dismiss(state: NotificationState, index: number) {
    state.notifications.splice(index, 1);
  },

  dismissByKey(state: NotificationState, key: string) {
    state.notifications = state.notifications.filter((n) => n.key != key);
  },

  dismissByResourceID(state: NotificationState, resourceID: string) {
    state.notifications = state.notifications.filter(
      (n) => n.resourceId != resourceID
    );
  },
} as MutationTree<NotificationState>;
