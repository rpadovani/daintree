<template>
  <div>
    <gl-alert
      v-for="(notification, index) in this.$store.getters[
        'notifications/getNotifications'
      ]"
      :variant="notification.variant"
      :key="notification.key + notification.region + notification.text"
      @dismiss="() => dismiss(index)"
      class="mt-2"
    >
      <div class="container-fluid">
        <div class="row">
          <b>
            <RegionText
              class="mr-1"
              :region="notification.region"
              v-if="notification.region"
          /></b>
          {{ notification.text }}
        </div>
      </div>
    </gl-alert>
  </div>
</template>

<script>
import { GlAlert } from "@gitlab/ui";
import RegionText from "@/components/common/RegionText";

export default {
  name: "Notifier",
  components: {
    RegionText,
    GlAlert,
  },
  methods: {
    dismiss(index) {
      this.$store.commit("notifications/dismiss", index);
    },
  },
};
</script>
