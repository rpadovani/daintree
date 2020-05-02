<template>
  <div>
    <Header hide-sub-header />

    <section class="gl-banner">
      <img
        src="/assets/undraw_japan_ubgk.svg"
        alt="Daintree"
        role="presentation"
        class="col-5 d-sm-none d-md-block"
      />
      <div class="gl-banner-content">
        <h1>Welcome to Daintree!</h1>
        <h4>
          An opensource alternative implementation of the Amazon Web Services'
          console.
        </h4>
        <p class="mt-2">
          Daintree is a website to manage some of your AWS resources: since this
          is an early preview, at the moment, it supports a subset of
          <b>Networking</b>, <b>EC2</b>, <b>SQS</b>, and <b>SNS</b>. We are
          working on extending support to other resources!
        </p>
        <p>
          Daintree does not aim to replace the original console, but would like
          to improve the user experience offering:
        </p>
        <ul>
          <li>
            <b>Multi-region view</b>: why should you observe resources from only
            one region, when there are 25 available?
          </li>
          <li>
            <b>Unified UX</b>: all components follow the same style, to have a
            coherent experience;
          </li>
          <li>
            <b>Fast navigation</b>: Daintree aims to be fast, without full page
            reloads, and making switching between roles, regions, and services
            painless;
          </li>
          <li>
            <b>...and much more:</b> Daintree tries to improve the daily
            experience of using AWS services from the web! You can read about
            all our features in the dedicated page, or login and try it!
          </li>
        </ul>

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

        <p class="mt-3">
          This website is not affiliated to Amazon, or AWS, or any of their
          subsidiaries. All trademarks registered. Source code on
          <a href="https://gitlab.com/rpadovani/daintree" target="_blank"
            >Gitlab
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
          >: no ads, no trackers, no data stored, no external resources.
        </p>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import Header from "@/components/Header/Header.vue";
import { GlButton, GlButtonGroup, GlIcon } from "@gitlab/ui";

@Component({ components: { Header, GlButton, GlButtonGroup, GlIcon } })
export default class Home extends Vue {}
</script>
