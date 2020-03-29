<template>
  <div>
    <gl-alert
      v-for="(notification, index) in this.$store.getters[
        'notifications/getNotifications'
      ]"
      :variant="notification.variant"
      :key="notification.text"
      @dismiss="() => dismiss(index)"
      class="mt-2"
    >
      {{ notification.text }}
    </gl-alert>
  </div>
</template>

<script>
import { GlAlert } from "@gitlab/ui";

export default {
  name: "Notifier",
  components: {
    GlAlert
  },
  methods: {
    dismiss(index) {
      this.$store.commit("notifications/dismiss", index);
    }
  }
};
</script>

<style scoped></style>
