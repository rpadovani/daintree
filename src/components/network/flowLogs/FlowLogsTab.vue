<template>
  <div>
    <gl-alert v-if="tabState === 'error'" variant="danger">
      {{ alertMessage }}
    </gl-alert>
    <gl-skeleton-loading v-if="tabState === 'loading'" />

    <gl-table :items="flows"> </gl-table>

    <gl-empty-state
      v-if="tabState === 'empty'"
      title="No related resources"
      svg-path="/assets/undraw_empty_xct9.svg"
      description="Daintree hasn't found any flow log associated to this resource!"
      compact
    />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import AWS from "aws-sdk";
import { FlowLog } from "aws-sdk/clients/ec2";
import { GlAlert, GlSkeletonLoading, GlEmptyState, GlTable } from "@gitlab/ui";
@Component({
  components: {
    GlAlert,
    GlSkeletonLoading,
    GlEmptyState,
    GlTable
  }
})
export default class FlowLogsTab extends Vue {
  @Prop(String) readonly resourceId!: string;
  @Prop(String) readonly region!: string;

  tabState: "loading" | "loaded" | "empty" | "error" = "loading";
  flows: FlowLog[] = [];

  alertMessage = "";

  describeFlowLogs() {
    this.tabState = "loading";
    const EC2 = new AWS.EC2({ region: this.region });
    EC2.describeFlowLogs(
      {
        Filter: [
          {
            Name: "resource-id",
            Values: [this.resourceId]
          }
        ]
      },
      (err, data) => {
        if (err) {
          this.alertMessage = err.message;
        } else {
          this.alertMessage = "";
          if (data.FlowLogs) {
            this.flows = data.FlowLogs;
          }
          this.tabState = this.flows.length === 0 ? "empty" : "loaded";
        }
      }
    );
  }

  beforeMount() {
    this.describeFlowLogs();
  }
}
</script>

<style scoped></style>
