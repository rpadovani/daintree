<template>
  <gl-tabs
    theme="blue"
    class="mx-auto mt-5"
    style="max-width: 600px; width: 99%;"
  >
    <gl-tab title="Login with Access Key">
      <gl-form-group
        id="access-key-id"
        label="Access Key ID"
        label-size="sm"
        description="You can create an AWS Access Key on the AWS Console"
        label-for="access-key"
      >
        <gl-form-input
          id="access-key"
          v-model="accessKey"
          :disabled="isAccessing"
        />
      </gl-form-group>

      <gl-form-group
        id="secret-id"
        label="Secret Access Key"
        label-size="sm"
        label-for="secret"
      >
        <gl-form-input
          id="secret"
          type="password"
          v-model="secretKey"
          :disabled="isAccessing"
        />
      </gl-form-group>

      <gl-button
        :disabled="accessKeyButtonDisabled"
        category="primary"
        variant="success"
        @click="loginWithAccessKey"
        block
        :loading="isAccessing"
        >Login with Access Key
      </gl-button>
    </gl-tab>
    <gl-tab title="Login with OAuth">
      <p>
        <router-link to="/oauth_instructions"
          >Read how to configure</router-link
        >
        your OAuth Server and Identity Pool to work with Daintree.
      </p>
      <gl-form-group
        id="cognito_domain"
        label="OAuth domain"
        label-size="sm"
        label-for="cognito-domain"
        description="The URL of your OAuth server login page"
      >
        <gl-form-input id="cognito-domain" v-model="cognitoDomain" />
      </gl-form-group>

      <gl-form-group
        id="cognito_client"
        label="OAuth Client ID"
        label-size="sm"
        label-for="cognito-client"
        description="The ID of the OAuth Client dedicated to Daintree"
      >
        <gl-form-input id="cognito-client" v-model="cognitoClientId" />
      </gl-form-group>

      <gl-form-group
        id="cognito_identity-pool"
        label="Cognito Identity Pool ID"
        label-size="sm"
        label-for="cognito-identity-pool"
        description="The ID of the AWS Identity Pool used to obtain a IAM Role."
      >
        <gl-form-input
          id="cognito-identity-pool"
          v-model="cognitoIdentityPoolId"
        />
      </gl-form-group>

      <gl-form-checkbox v-model="cognitoRemember"
        >Remember data for next login</gl-form-checkbox
      >

      <gl-button
        :disabled="isCognitoButtonDisabled"
        category="primary"
        variant="success"
        @click="loginWithCognito"
        :loading="isAccessing"
        block
        >Login with OAuth
      </gl-button>
    </gl-tab>
  </gl-tabs>
</template>

<script lang="ts">
import {
  GlAlert,
  GlFormGroup,
  GlFormInput,
  GlButton,
  GlTab,
  GlTabs,
  GlEmptyState,
  GlIcon,
  GlFormCheckbox,
  GlLoadingIcon,
} from "@gitlab/ui";
import Component from "vue-class-component";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";

@Component({
  components: {
    GlFormGroup,
    GlTabs,
    GlTab,
    GlFormInput,
    GlButton,
    GlAlert,
    GlEmptyState,
    GlIcon,
    GlFormCheckbox,
    GlLoadingIcon,
  },
})
export default class Login extends DaintreeComponent {
  accessKey = "";
  secretKey = "";

  cognitoDomain = "";
  cognitoClientId = "";
  cognitoIdentityPoolId = "";
  cognitoRemember = false;

  isAccessing = false;

  get accessKeyButtonDisabled() {
    return this.isAccessing || this.accessKey === "" || this.secretKey === "";
  }

  get isCognitoButtonDisabled(): boolean {
    return (
      this.isAccessing ||
      this.cognitoDomain === "" ||
      this.cognitoClientId === "" ||
      this.cognitoIdentityPoolId === ""
    );
  }

  async loginWithAccessKey(): Promise<void> {
    this.isAccessing = true;
    this.dismissAlertByKey("login");
    this.dismissAlertByKey("credentialsExpired");

    try {
      await this.$store.dispatch("sts/loginWithAccessKey", {
        accessKeyId: this.accessKey,
        secretAccessKey: this.secretKey,
      });
      await this.$router.push(this.$store.getters["sts/routeAfterLogin"]);
    } catch (err) {
      this.showError(err, "login");
    } finally {
      this.isAccessing = false;
    }
  }

  mounted(): void {
    this.cognitoRemember =
      localStorage.getItem("deleteCognitoDataASAP") !== "Y";
    if (localStorage.getItem("deleteCognitoDataASAP") === "Y") {
      //Ops... this can happen if the user never completes the login for any reason
      localStorage.clear();
    }

    this.cognitoDomain = localStorage.getItem("cognitoDomain") || "";
    this.cognitoClientId = localStorage.getItem("cognitoClientId") || "";
    this.cognitoIdentityPoolId =
      localStorage.getItem("cognitoIdentityPoolId") || "";
  }

  loginWithCognito(): void {
    this.dismissAlertByKey("credentialsExpired");

    //We need to remember the identity pool for when we are redirected to Daintree
    localStorage.setItem("cognitoIdentityPoolId", this.cognitoIdentityPoolId);
    if (this.cognitoRemember) {
      localStorage.setItem("cognitoClientId", this.cognitoClientId);
      localStorage.setItem("cognitoDomain", this.cognitoDomain);
    } else {
      //As soon as we login, we remove the cognito identity pool id as well
      localStorage.setItem("deleteCognitoDataASAP", "Y");
    }

    //Store also the redirect after login
    const routeAfterLogin = this.$store.getters["sts/routeAfterLogin"];
    if (routeAfterLogin && routeAfterLogin.path !== "undefined") {
      localStorage.setItem("routeAfterLogin", routeAfterLogin.path);
    }

    //We remove any https or trailing slash because we add them
    const cognitoDomain = this.cognitoDomain
      .replace("https://", "")
      .replace("/", "");

    const redirectUri = `${window.location.protocol}//${window.location.host}/cognito_callback.html`;
    window.location.href =
      `https://${cognitoDomain}` +
      `/login?client_id=${this.cognitoClientId}` +
      `&response_type=token&scope=openid&redirect_uri=${redirectUri}`;
  }
}
</script>
