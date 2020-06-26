export class AppNotification {
  variant: AlertVariant = "info";
  text = "";
  // We use the key to group notifications, so we can dismiss all related notifications at once
  // E.G: while creating a VPC, user makes some errors. When finally VPC has been created, we can dismiss
  // all notifications related to such errors
  key = "";
  // We can also set notifications about a certain resource id, so we have super granular control.
  resourceId?: string;

  //We should always put the region, it will shows the flag and use it as unique key for the alert
  region?: string;
}

export type AlertVariant = "info" | "danger" | "tip" | "warning" | "success";

export class NotificationState {
  notifications: AppNotification[] = [];
}
