import { Component, Vue } from "vue-property-decorator";

import { Credentials } from "aws-sdk/lib/core";

import {
  standardDate,
  standardDateFromUnixSecondsString,
} from "@/mixins/formatters";
import { mapActions, mapGetters, mapMutations } from "vuex";
import { AppNotification } from "@/store/notifications/state";
import store from "@/store";
import { Command } from "@tauri-apps/api/shell";

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
    ...mapMutations("header", [
      "incrementLoadingCount",
      "decreaseLoadingCount",
    ]),
  },
  computed: {
    ...mapGetters("sts", {
      regionsEnabled: "regions",
      stsCredentials: "credentials",
      currentRoleIndex: "currentRoleIndex",
      accountId: "account",
    }),
    ...mapGetters("header", ["isLoading"]),
  },
})
export class DaintreeComponent extends Vue {
  showAlert!: (notification: AppNotification) => void;
  dismissAlertByKey!: (key: string) => void;
  dismissAlertByResourceID!: (resourceID: string) => void;
  regionsEnabled!: string[];
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

  isLoading!: boolean;
  incrementLoadingCount!: () => void;
  decreaseLoadingCount!: () => void;

  showError(msg: string, key: string, region?: string): void {
    this.showAlert({
      key: key,
      text: msg,
      variant: "danger",
      region,
    });
  }

  hideErrors(key: string): void {
    this.dismissAlertByKey(key);
  }

  standardDate(date: Date): string {
    return standardDate(date);
  }

  standardDateFromUnixSecondsString(unix: string): string {
    return standardDateFromUnixSecondsString(unix);
  }

  async credentials(): Promise<Credentials | undefined> {
    //TODO: move this to Rust as soon as the AWS Rust SDK implements
    //  a proper credential provider
    const accessKeyId = await new Command(
      "printenv",
      "AWS_ACCESS_KEY_ID"
    ).execute();

    const secretAccessKey = await new Command(
      "printenv",
      "AWS_SECRET_ACCESS_KEY"
    ).execute();

    if (accessKeyId.code !== 0 || secretAccessKey.code !== 0) {
      //TODO: redirect to a dedicated page
      this.showAlert({
        key: "credentialsExpired",
        text: "No credentials found.",
        variant: "warning",
      });

      return;
    }

    const sessionToken = await new Command(
      "printenv",
      "AWS_SESSION_TOKEN"
    ).execute();

    const credentials = new Credentials(
      accessKeyId.stdout,
      secretAccessKey.stdout,
      sessionToken.code === 0 ? sessionToken.stdout : ""
    );

    // Refresh credentials, if necessary
    console.log("HEREs");
    await credentials.getPromise();

    console.log(JSON.parse(JSON.stringify(credentials)));

    if (credentials.expired) {
      this.showAlert({
        key: "credentialsExpired",
        text: "Your credentials have expired, please login again.",
        variant: "warning",
      });

      return;
    }

    console.log(credentials);

    return credentials;
  }
}
