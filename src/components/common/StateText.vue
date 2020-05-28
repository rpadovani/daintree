<template>
  <div class="container">
    <div class="row" :class="color">
      <gl-loading-icon
        class="mr-1"
        inline
        v-if="showLoadingIcon"
      ></gl-loading-icon>
      {{ state }}
    </div>
  </div>
</template>

<script lang="ts">
import { GlLoadingIcon } from "@gitlab/ui";
import { Component, Prop, Vue } from "vue-property-decorator";
import {
  InstanceStateName,
  SnapshotState,
  VolumeState,
} from "aws-sdk/clients/ec2";

@Component({
  components: {
    GlLoadingIcon,
  },
})
export default class StateText extends Vue {
  @Prop(String) state!:
    | "pending"
    | "failed"
    | "available"
    | "deleting"
    | "deleted"
    | "attached"
    | "detached"
    | "active"
    | "healthy"
    | "unhealthy"
    | "unused"
    | InstanceStateName
    | VolumeState
    | SnapshotState;

  get showLoadingIcon(): boolean {
    return [
      "pending",
      "deleting",
      "shutting-down",
      "stopping",
      "deleting",
      "creating",
    ].includes(this.state);
  }

  get color(): string {
    switch (this.state) {
      case "running":
      case "attached":
      case "active":
      case "healthy":
      case "in-use":
      case "completed":
        return "text-success";
      case "deleting":
      case "deleted":
      case "terminated":
      case "detached":
      case "unhealthy":
      case "error":
        return "text-danger";
      case "pending":
      case "creating":
      case "available":
        return "text-info";
      case "failed":
        return "text-light";
      case "shutting-down":
      case "stopped":
      case "stopping":
      case "unused":
        return "text-warning";
      default:
        return "";
    }
  }
}
</script>

<style scoped></style>
