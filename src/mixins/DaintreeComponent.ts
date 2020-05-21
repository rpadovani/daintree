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

  standardDate = standardDate;

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
