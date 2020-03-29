<template>
  <div>
    <Header hide-sub-header />

    <section class="gl-banner" v-if="loading">
      <img
        src="/assets/undraw_news_go0e.svg"
        alt="Changelog"
        role="presentation"
      />
      <div class="gl-banner-content">
        <h1>Hold tight!</h1>
        <p class="mt-2">
          Daintree is parsing the latest news just for you, hold on!
        </p>
      </div>
    </section>

    <div class="container">
      <div v-for="news in data" :key="news.tagName" class="mt-1">
        <h1>
          {{ news.name }}
          <gl-badge variant="info">{{
            news.released_at | standardDate
          }}</gl-badge>
        </h1>
        <p v-html="news.description_html"></p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import Header from "@/components/Header/Header.vue";
import { GlButton, GlButtonGroup, GlBadge } from "@gitlab/ui";
import moment from "moment";

@Component({
  components: { Header, GlButton, GlButtonGroup, GlBadge },
  filters: {
    standardDate(date: Date): string {
      moment.locale();
      return moment(date).format("ll");
    }
  }
})
export default class NotFound extends Vue {
  loading = true;
  data = [];

  async mounted() {
    const response = await fetch("/changelog.json");
    this.data = await response.json();
    this.loading = false;
  }
}
</script>
