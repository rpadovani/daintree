<template>
  <div>
    <gl-broadcast-message
      v-if="isVisible"
      @dismiss="isVisible = false"
      theme="blue"
    >
      Since your last visit, Daintree has been updated, and new features have
      been added! Take a look to the
      <router-link
        class="gl-font-weight-bold gl-text-white gl-text-decoration-underline gl-hover-text-white"
        to="/changelog"
        @click.native="isVisible = false"
        >changelog!</router-link
      >
    </gl-broadcast-message>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { GlBroadcastMessage } from "@gitlab/ui";

@Component({
  components: {
    GlBroadcastMessage,
  },
})
export default class Announcements extends Vue {
  private isVisible = true;
  private readonly currentAppVersion = process.env.VUE_APP_VERSION;
  private readonly localStorageKey = "versionWhenLastVisited";

  mounted(): void {
    if (!this.currentAppVersion) {
      return;
    }

    const versionWhenLastVisited = localStorage.getItem(this.localStorageKey);

    //If this is the first visit, we do not bug the user with the announcement
    if (!versionWhenLastVisited) {
      localStorage.setItem(this.localStorageKey, this.currentAppVersion);
      return;
    }

    if (versionWhenLastVisited === this.currentAppVersion) {
      return;
    }

    this.isVisible = true;
    localStorage.setItem(this.localStorageKey, this.currentAppVersion);
  }
}
</script>

<style scoped></style>
