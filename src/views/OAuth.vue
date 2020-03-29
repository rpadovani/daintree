<template>
  <div>
    <Header hide-sub-header />

    <div class="container">
      <section class="gl-banner">
        <div class="gl-banner-illustration">
          <img
            src="/assets/undraw_authentication_fsn5.svg"
            alt="Daintree"
            role="presentation"
          />
        </div>
        <div class="gl-banner-content">
          <h1 class="gl-banner-title">
            Login with OAuth!
          </h1>
          <p>
            If you don't want to share your AWS keys with a random website
            (rightly so!), you can login with an OAuth provider of your choice,
            and generate temporary credentials with an
            <a
              href="https://docs.aws.amazon.com/cognito/latest/developerguide/identity-pools.html"
              target="_blank"
              >AWS Identity Pool <gl-icon name="external-link" /> </a
            >.
          </p>
          <p>
            Daintree will authenticate through your OAuth provider, and then
            will exchange the OAuth token it receives from the provider with AWS
            credentials thanks to the AWS Identity Pool.
          </p>
          <p>
            The workflow has been thoroughly tested with AWS Cognito as OAuth
            provider, but Daintree has been coded to support any OAuth provider.
            If you find any issue, or if you are interested in a dedicated
            subdomain just for you, with the configuration data already
            hardcoded, please write to
            <a href="mailto:rpadovani@daintree.app">rpadovani@daintree.app</a>.
          </p>
          <h1 class="gl-banner-title">
            Parameters
          </h1>
          <p>
            For this workflow to work you need a well configured
            <a
              href="https://docs.aws.amazon.com/cognito/latest/developerguide/role-based-access-control.html"
              target="_blank"
              >AWS Identity Pool <gl-icon name="external-link" /> </a
            >: you need then to specify the ID of such pool in the parameter
            <b>Cognito Identity Pool ID</b> during the login.
          </p>
          <p>
            Moreover, Daintree needs to be authorized to invoke your OAuth
            provider: you need to create a dedicated client, with these
            parameters:
          </p>
          <ul>
            <li>
              <b>Callback URL(s):</b>
              https://daintree.app/cognito_callback.html,
              https://www.daintree.app/cognito_callback.html
            </li>
            <li><b>OAuth flow:</b> implicit grant</li>
            <li><b>OAuth scope:</b> openid</li>
          </ul>

          <p>
            Since Daintree uses the implicit grant flow (given there is no
            backend in the app) the OAuth client needs to do not have any client
            secret to work.
          </p>

          <p>
            After you created your OAuth client, you can login in Daintree. You
            need to specify your OAuth client ID and the URL for the login to
            you OAuth provider during the login.
          </p>

          <div class="row justify-content-center">
            <gl-button-group>
              <gl-button variant="info" category="secondary" to="/about"
                >See all features
              </gl-button>
              <gl-button category="secondary" to="/security"
                >What about security?</gl-button
              >
              <gl-button to="/login" variant="success">Login</gl-button>
            </gl-button-group>
          </div>

          <p class="mt-2">
            If you have any question, please drop an email to
            <a href="mailto:rpadovani@daintree.app">rpadovani@daintree.app</a>.
            And if you find any issue, or have any suggestion, please
            <a
              href="https://gitlab.com/rpadovani/daintree/-/issues/new?issue%5Bassignee_id%5D=&issue%5Bmilestone_id%5D="
              target="_blank"
              >open an issue!
              <gl-icon name="external-link" />
            </a>
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import Header from "@/components/Header/Header.vue";
import { GlButton, GlButtonGroup, GlIcon } from "@gitlab/ui";

@Component({ components: { Header, GlButton, GlButtonGroup, GlIcon } })
export default class OAuthInstructions extends Vue {}
</script>
