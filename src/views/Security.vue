<template>
  <div>
    <Header hide-sub-header />

    <div class="container">
      <section class="gl-banner">
        <div class="gl-banner-illustration">
          <img
            src="/assets/undraw_Security_on_ff2u.svg"
            alt="Daintree"
            role="presentation"
          />
        </div>
        <div class="gl-banner-content">
          <h1 class="gl-banner-title">
            Daintree respects your privacy and your security!
          </h1>
          <p>
            Over AWS, you probably have critical and private data. To be sure to
            do not collect any private information,
            <b>Daintree doesn't collect any data at all</b>.
          </p>
          <p>
            This means in Daintree there isn't any data analytics service (not
            Google Analytics, nor any alternative). There isn't also any error
            tracker. <b>All your AWS data never leave your browser</b>.
          </p>
          <p>
            You can easily verify all this looking to your network traffic, or
            simply reading the source code of the application, available on
            <a href="https://gitlab.com/rpadovani/daintree" target="_blank"
              >Gitlab
              <gl-icon name="external-link" />
              .</a
            >
            Also the deploy pipeline is public, so you can check how Daintree is
            deployed. Since it is hosted on Gitlab Pages, Daintree's developers
            do not have access to the deployed code.
          </p>

          <p>
            If you do not trust to give your AWS Access keys to a random website
            (rightly so!) you can use
            <router-link to="/oauth_instructions"
              >OAuth and AWS Identity pools to login</router-link
            >
            . Or you can download the source code and run it on your own
            website!
          </p>

          <p>
            Moreover, Daintree doesn't store any sensitive data on your browser,
            nor it caches data received from AWS. It saves some technical
            cookies, as the list of the regions you have enabled, and it saves
            your OAuth data if you ask so. It never stores your AWS Access Key
            or Secret Key - and this is why when you reload the page, you have
            to login again. And every time you explicitly logout, Daintree
            deletes all the bits of information stored on your browser.
          </p>

          <p>
            Due all this, nobody knows you are here, or if you have found any
            issue at all with the application. So, if you enjoy Daintree, or if
            you have any question, please drop an email to
            <a href="mailto:rpadovani@daintree.app">rpadovani@daintree.app</a>.
            And if you find any issue, or have any suggestion, please
            <a
              href="https://gitlab.com/rpadovani/daintree/-/issues/new?issue%5Bassignee_id%5D=&issue%5Bmilestone_id%5D="
              target="_blank"
              >open an issue!
              <gl-icon name="external-link" />
            </a>
          </p>

          <p>
            If you have found a security issue, please write to
            <a href="mailto:security@daintree.app">security@daintree.app</a>.
          </p>

          <div class="row justify-content-center">
            <gl-button-group>
              <gl-button variant="info" category="secondary" to="/about"
                >See all features
              </gl-button>
              <gl-button to="/login" variant="success">Login</gl-button>
            </gl-button-group>
          </div>
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
export default class Security extends Vue {}
</script>
