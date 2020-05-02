import { Component, Vue } from "vue-property-decorator";
import { mapActions } from "vuex";
import { AppNotification } from "@/store/notifications/state";

@Component({
  methods: mapActions("notifications", [
    "showAlert",
    "dismissAlertByKey",
    "dismissAlertByResourceID",
  ]),
})
export default class Notifications extends Vue {
  showAlert!: (notification: AppNotification) => void;
  dismissAlertByKey!: (key: string) => void;
  dismissAlertByResourceID!: (resourceID: string) => void;

  showError(msg: string, key: string) {
    this.showAlert({
      key: key,
      text: msg,
      variant: "danger",
    });
  }

  hideErrors(key: string) {
    this.dismissAlertByKey(key);
  }
}
