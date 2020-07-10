<template functional>
  <div class="container">
    <div class="row mt-5 text-center">
      <gl-empty-state
        compact
        title="Welcome to Daintree.app"
        svg-path="/assets/undraw_japan_ubgk.svg"
        description="An opensource alternative implementation of the Amazon Web Services' console, with multi-region support!"
        primary-button-link="/#/login"
        primary-button-text="Login"
        secondary-button-link="/#/about"
        secondary-button-text="See all features"
      />
    </div>

    <div class="row mt-5 text-center justify-content-between">
      <div class="col-12 col-md-4">
        <gl-card class="col-11 pl-0 pr-0">
          <template #header>
            <h4>Multi region support</h4>
          </template>
          <img
            class="col-12"
            src="/assets/undraw_connected_world_wuay.svg"
            alt="Regions selector"
          />
          <p class="mt-1">
            Why should you observe resources from only one region, when there
            are 25 available?
          </p>
        </gl-card>
      </div>

      <div class="col-12 col-md-4">
        <gl-card class="col-11 pl-0 pr-0">
          <template #header>
            <h4>Secure</h4>
          </template>
          <img
            class="col-12 mt-2 mb-2"
            src="/assets/undraw_privacy_protection_nlwy.svg"
            alt="Privacy protection"
          />
          <p class="mt-1">
            No ads, no spyware, no trackers: all communications stay between you
            and AWS.
          </p>
        </gl-card>
      </div>

      <div class="col-12 col-md-4">
        <gl-card class="col-11 pl-0 pr-0">
          <template #header>
            <h4>Coherent interface</h4>
          </template>
          <img
            class="col-12 mt-2 mb-2"
            src="/assets/undraw_redesign_feedback_48ti.svg"
            alt="Cool design"
          />
          <p class="mt-1">
            All pages follow the same style, to have a pleasant experience.
          </p>
        </gl-card>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <h4>...and much, much more!</h4>
        <p>
          Help texts to navigate easily among the thousands feature of AWS, fast
          role switching to manage multiple accounts, instantaneous navigation
          to change page without waiting, beautiful graphs you can resize and
          download to monitor performances, and much more: you can take a look
          to all the features in
          <router-link to="/about">the dedicated page</router-link>.
        </p>
      </div>
    </div>

    <div class="row mt-3">
      <p class="small">
        This website is not affiliated to Amazon, or AWS, or any of their
        subsidiaries. Source code on
        <a href="https://gitlab.com/rpadovani/daintree" target="_blank"
          >Gitlab
          <gl-icon name="external-link" />
        </a>
        and mirrored over
        <a href="https://github.com/rpadovani/daintree" target="_blank"
          >Github
          <gl-icon name="external-link" />
          .</a
        >
        Illustrations by Katerina Limpitsouni from
        <a href="https://undraw.co/" target="_blank"
          >unDraw
          <gl-icon name="external-link" />
          .</a
        >
        Daintree takes
        <router-link to="/security"
          >your privacy and security seriously</router-link
        >: no ads, no trackers, no data stored, no external resources. You can
        <router-link to="/contribute">contribute</router-link> too!
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { GlIcon, GlEmptyState, GlCard } from "@gitlab/ui";

@Component({
  components: { GlCard, GlEmptyState, GlIcon },
})
export default class Home extends Vue {}
</script>
