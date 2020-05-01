<template>
  <div>
    <Header hide-sub-header />

    <div class="container">
      <section class="gl-banner">
        <div
          v-for="news in data"
          :key="news.tagName"
          class="gl-banner-content mt-1"
        >
          <h1 class="gl-banner-title">
            {{ news.name }}
            <gl-badge variant="info">{{
              news.released_at | standardDate
            }}</gl-badge>
          </h1>
          <p v-html="news.description_html"></p>
        </div>
      </section>
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
  data = [];

  async mounted() {
    const response = await fetch("/changelog.json");
    this.data = await response.json();
  }
}
</script>
