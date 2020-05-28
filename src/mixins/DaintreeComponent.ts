import { Component, Vue } from "vue-property-decorator";

import { TagList } from "aws-sdk/clients/ec2";
import { Credentials } from "aws-sdk/lib/core";

import {
  standardDate,
  standardDateFromUnixSecondsString,
} from "@/mixins/formatters";
import { mapActions, mapGetters } from "vuex";
import { AppNotification } from "@/store/notifications/state";
import store from "@/store";

@Component({
  filters: {
    standardDate,
    standardDateFromUnixSecondsString,
  },
  methods: {
    ...mapActions("notifications", [
      "showAlert",
      "dismissAlertByKey",
      "dismissAlertByResourceID",
    ]),
  },
  computed: {
    ...mapGetters("sts", {
      regionsEnabled: "regions",
      stsCredentials: "credentials",
      currentRoleIndex: "currentRoleIndex",
      accountId: "account",
    }),
  },
})
export class DaintreeComponent extends Vue {
  showAlert!: (notification: AppNotification) => void;
  dismissAlertByKey!: (key: string) => void;
  dismissAlertByResourceID!: (resourceID: string) => void;
  regionsEnabled!: string[];
  stsCredentials!: Credentials;
  currentRoleIndex!: number;
  accountId!: string | undefined;

  //Injected by Gitlab UI: https://gitlab-org.gitlab.io/gitlab-ui/?path=/story/base-toast--default
  $toast!: {
    show: (
      text: string,
      options?: {
        position?:
          | "top-right"
          | "top-center"
          | "top-left"
          | "bottom-right"
          | "bottom-center"
          | "bottom-left"; // Position of the toast container
        duration?: number; //Display time of the toast in millisecond
        action?: Record<string, unknown>; // 	Add single actions to toast
        fullWidth?: boolean; //	Enable Full Width
        fitToScreen?: boolean; // 	Fits to Screen on Full Width
        className?: string | string[]; //	Custom css class name of the toast
        containerClass?: string | string[]; //	Custom css classes for toast container
        iconPack?:
          | "material"
          | "fontawesome"
          | "mdi"
          | "custom-class"
          | "callback";
        icon?: string | Record<string, unknown>; //	Material icon name as string
        type?: "success" | "info" | "error";
        theme?: "toasted-primary" | "outline" | "bubble";
        onComplete?: () => void; // 	Trigger when toast is completed
        closeOnSwipe?: boolean; // 	Closes the toast when the user swipes it
        keepOnHover?: boolean; // 	Prevents toast from closing on hover
        singleton?: boolean; // 	Only allows one toast at a time
      }
    ) => void;
  };

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

  standardDate(date: Date): string {
    return standardDate(date);
  }

  extractNameFromTags(tags: TagList): string | undefined {
    const nameTag = tags.filter((v) => v.Key === "Name");

    if (nameTag.length > 0) {
      return nameTag[0].Value;
    }

    return "";
  }

  async credentials(): Promise<Credentials | undefined> {
    try {
      await this.stsCredentials.getPromise();
      return this.stsCredentials;
    } catch {
      store.commit("sts/routeAfterLogin", this.$route.fullPath);
      this.showAlert({
        key: "credentialsExpired",
        text: "Your credentials have expired, please login again.",
        variant: "warning",
      });
      sessionStorage.clear();
      this.$router.push("/login");
    }
  }
}
