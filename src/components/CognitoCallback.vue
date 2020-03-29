<template>
  <div>
    <Header hide-sub-header hide-refresher />
    <gl-empty-state
      v-if="!failedLogin"
      class="mt-5"
      title="Logging in"
      svg-path="/assets/undraw_loading_frh4.svg"
      description="Daintree is logging you in, please wait!"
      compact
    />
    <gl-empty-state
      v-if="failedLogin"
      class="mt-5"
      title="Something went wrong"
      svg-path="/assets/undraw_access_denied_6w73.svg"
      description="Unfortunately, we weren't able to logging you in. Please see the error above. If you think it is a mistake, please report a issue and we will help you!"
      compact
    />
  </div>
</template>

<script lang="ts">
import Header from "./Header/Header.vue";
import { Component } from "vue-property-decorator";
import Notifications from "@/mixins/notifications";
import { GlEmptyState } from "@gitlab/ui";
@Component({
  components: { Header, GlEmptyState }
})
export default class CognitoCallback extends Notifications {
  failedLogin = false;

  mounted() {
    this.hideErrors("cognitoCallback");

    const cognitoIdentityPoolId = localStorage.getItem("cognitoIdentityPoolId");
    if (!cognitoIdentityPoolId) {
      this.failedLogin = true;
      this.showError(
        "Daintree hasn't found the id of the cognito identity pool",
        "cognitoCallback"
      );
      return;
    }

    const deleteData = localStorage.getItem("deleteCognitoDataASAP");
    if (deleteData === "Y") {
      localStorage.clear();
    }

    const hash = this.$route.hash;

    if (!hash) {
      this.failedLogin = true;
      this.showError("No hash found", "cognitoCallback");
      return;
    }
    const hashes = hash.replace("#", "").split("&");
    const idTokens = hashes[0].split("=");

    if (idTokens[0] !== "id_token") {
      this.failedLogin = true;

      this.showError(
        "Daintree hasn't found a valid id token in the response",
        "cognitoCallback"
      );
      return;
    }

    const idToken = idTokens[1];
    const claims = JSON.parse(atob(idToken.split(".")[1]));
    const issuer = claims["iss"];
    if (!issuer) {
      this.failedLogin = true;

      this.showError(
        "Daintree hasn't found a valid Issuer in the claims",
        "cognitoCallback"
      );
      return;
    }

    this.$store
      .dispatch("sts/loginWithCognito", {
        issuer,
        idToken,
        cognitoIdentityPoolId
      })
      .then(() => {
        let routeAfterLogin = localStorage.getItem("routeAfterLogin");
        if (routeAfterLogin === "undefined") {
          routeAfterLogin = "/home";
        }

        this.$router.push(routeAfterLogin || "/home");
        this.failedLogin = false;
        localStorage.removeItem("routeAfterLogin"); // Clean for next time
      })
      .catch(() => {
        this.failedLogin = true;
      });
  }
}
</script>

<style scoped></style>
