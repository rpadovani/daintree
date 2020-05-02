<template>
  <div class="row" :class="color">
    <gl-loading-icon
      class="mr-1"
      inline
      v-if="showLoadingIcon"
    ></gl-loading-icon>
    {{ state }}
  </div>
</template>

<script lang="ts">
import { GlLoadingIcon } from "@gitlab/ui";
import { Component, Prop, Vue } from "vue-property-decorator";
import { InstanceStateName } from "aws-sdk/clients/ec2";

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
    | InstanceStateName;

  get showLoadingIcon(): boolean {
    return [
      "pending",
      "deleting",
      "shutting-down",
      "stopping",
      "deleting",
    ].includes(this.state);
  }

  get color(): string {
    switch (this.state) {
      case "running":
      case "attached":
      case "active":
      case "available":
        return "text-success";
      case "deleting":
      case "deleted":
      case "terminated":
      case "detached":
        return "text-danger";
      case "pending":
        return "text-info";
      case "failed":
        return "text-light";
      case "shutting-down":
      case "stopped":
      case "stopping":
        return "text-warning";
      default:
        return "";
    }
  }
}
</script>

<style scoped></style>
