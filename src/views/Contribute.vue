<template>
  <div>
    <Header hide-sub-header />

    <div class="container">
      <section class="gl-banner">
        <div class="gl-banner-illustration">
          <img
            src="/assets/undraw_super_thank_you_obwk.svg"
            alt="Thanks you!"
            role="presentation"
          />
        </div>
        <div class="gl-banner-content">
          <h1 class="gl-banner-title">
            Thanks for taking time to improve Daintree!
          </h1>
          <p>
            Daintree is a small opensource project, developed during free time.
            Any help is appreciated!
          </p>

          <h1 class="gl-banner-title">
            Report a bug
          </h1>
          <p>
            If you found a bug, the best way to report it would be opening an
            issue in the
            <a
              href="https://gitlab.com/rpadovani/daintree/-/issues/new?issue%5Bassignee_id%5D=&issue%5Bmilestone_id%5D="
              target="_blank"
              >Daintree issue tracker <gl-icon name="external-link" /> </a
            >, over Gitlab. But if you don't have a Gitlab account, fear not,
            you can send an email to
            <a
              href="mailto:incoming+rpadovani-daintree-18158864-issue-@incoming.gitlab.com"
              >incoming+rpadovani-daintree-18158864-issue-@incoming.gitlab.com</a
            >: your email will be added to the issue tracker, and you will
            receive replies with all the updates about the issue!
          </p>

          <p>
            If you have found a security issue, please write to
            <a href="mailto:security@daintree.app">security@daintree.app</a>.
          </p>

          <h1 class="gl-banner-title">
            Spread the word!
          </h1>

          <p>
            More users mean more feedback, and more people available to help the
            development: feel free to share this website with your friends! If
            you are on Twitter, you can follow the main developer,
            <a href="https://twitter.com/rpadovani93"
              >@rpadovani93<gl-icon name="external-link" /></a
            >.
          </p>

          <h1 class="gl-banner-title">
            Contact the developer
          </h1>

          <p>
            Since there are no trackers on this website, developers have no idea
            if it is used at all! If you find Daintree useful, an email to the
            developers is always welcome! You can reach out the main developer
            at
            <a href="mailto:rpadovani@daintree.app">rpadovani@daintree.app</a>!
          </p>

          <h1 class="gl-banner-title">
            Write some code
          </h1>

          <p>
            Daintree is written in Vue.js + Typescript: if you want to
            contribute to its development, go on the
            <a href="https://gitlab.com/rpadovani/daintree" target="_blank"
              >project's page over Gitlab <gl-icon name="external-link" />
            </a>
            and read the <code>CONTRIBUTING.md</code> file! If you don't know
            where to start, write to
            <a href="mailto:rpadovani@daintree.app">rpadovani@daintree.app</a>,
            he will gladly help you!
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
export default class Contribute extends Vue {}
</script>
