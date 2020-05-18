<template>
  <div v-if="targetGroup">
    <gl-tabs theme="blue">
      <gl-tab title="Overview">
        <div class="row justify-content-around mt-3">
          <gl-card class="col-3" title="Protocol">{{
            targetGroup.Protocol
          }}</gl-card>
          <gl-card class="col-3" title="Port">{{ targetGroup.Port }}</gl-card>
          <gl-card class="col-3" title="Target type">{{
            targetGroup.TargetType
          }}</gl-card>
        </div>

        <div class="row justify-content-around mt-3">
          <gl-card class="col-3" title="Region">
            <RegionText :region="targetGroup.region" />
          </gl-card>
          <gl-card class="col-3" title="VPC ID">
            <router-link :to="`/network/vpcs?vpcId=${targetGroup.VpcId}`">
              {{ targetGroup.VpcId }}
            </router-link>
          </gl-card>
          <gl-card class="col-3" title="Load balancers">
            <router-link
              v-for="lb in targetGroup.LoadBalancerArns"
              :key="lb"
              :to="`/ec2/loadBalancers?loadBalancerArn=${lb}`"
              class="pt-2"
            >
              {{ extractLBName(lb) }}
            </router-link>
          </gl-card>
        </div>

        <h5 class="mt-2">Tags</h5>
        <TagsTable
          :key="targetGroup.TargetGroupArn"
          :region="targetGroup.region"
          :resource-id="targetGroup.TargetGroupArn"
          provider="ELB"
        />
      </gl-tab>
      <gl-tab title="Targets" @click="describeTargets">
        <gl-alert
          v-if="targetsState === 'error'"
          variant="danger"
          :dismissible="false"
          >{{ targetsError }}
        </gl-alert>
        <gl-skeleton-loading v-if="targetsState === 'loading'" />

        <gl-table :items="targetsFlatten">
          <template v-slot:cell(AvailabilityZone)="data">
            <RegionText :region="data.value" is-az />
          </template>

          <template v-slot:cell(state)="data">
            <StateText :state="data.value" />
          </template>
        </gl-table>

        <gl-empty-state
          v-if="targetsState === 'empty'"
          title="No related targets"
          svg-path="/assets/undraw_empty_xct9.svg"
          description="Daintree hasn't found any listener associated to this load balancer!"
          compact
        />
      </gl-tab>
      <gl-tab title="Health checks">
        <div class="row justify-content-around mt-3">
          <gl-card class="col-3" title="Protocol" v-if="targetGroup.Protocol">
            {{ targetGroup.Protocol }}
          </gl-card>

          <gl-card
            class="col-3"
            title="Status"
            v-if="targetGroup.HealthCheckEnabled !== undefined"
          >
            {{ targetGroup.HealthCheckEnabled ? "Enabled" : "Disabled" }}
          </gl-card>

          <gl-card
            class="col-3"
            title="Path"
            v-if="targetGroup.HealthCheckPath"
          >
            {{ targetGroup.HealthCheckPath }}
          </gl-card>
        </div>
        <div class="row justify-content-around mt-3">
          <gl-card
            class="col-3"
            title="Health check port"
            v-if="targetGroup.HealthCheckPort"
          >
            {{ targetGroup.HealthCheckPort }}
          </gl-card>

          <gl-card class="col-3" title="Healthy threshold">
            {{ targetGroup.HealthyThresholdCount }}
          </gl-card>

          <gl-card class="col-3" title="Unhealthy threshold">
            {{ targetGroup.UnhealthyThresholdCount }}
          </gl-card>
        </div>
        <div class="row justify-content-around mt-3">
          <gl-card class="col-3" title="Timeout">
            {{ targetGroup.HealthCheckTimeoutSeconds }} seconds
          </gl-card>

          <gl-card class="col-3" title="Interval">
            {{ targetGroup.HealthCheckIntervalSeconds }} seconds
          </gl-card>

          <gl-card class="col-3" title="Success codes">
            {{ targetGroup.Matcher.HttpCode }}
          </gl-card>
        </div>
      </gl-tab>

      <!--        TODO: we need to retrieve the type of the load balancer -->
      <!--      <gl-tab title="Monitoring">-->
      <!--        <div class="row justify-content-between">-->
      <!--          <CloudwatchWidget-->
      <!--            class="col-12 col-md-6 col-lg-4"-->
      <!--            v-for="widget in cloudwatchWidgets"-->
      <!--            :metrics="widget.metrics"-->
      <!--            :live-data="false"-->
      <!--            :stat="widget.stat"-->
      <!--            :region="targetGroup.region"-->
      <!--            :key="widget.graphTitle + targetGroup.TargetGroupArn"-->
      <!--            :legend="{ position: 'hidden' }"-->
      <!--            :graph-title="widget.graphTitle"-->
      <!--            :label="targetGroup.TargetGroupName || targetGroup.TargetGroupArn"-->
      <!--            :y-axis="widget.yAxis"-->
      <!--          />-->
      <!--        </div>-->
      <!--      </gl-tab>-->
    </gl-tabs>
  </div>
</template>

<script lang="ts">
import {
  GlBadge,
  GlTab,
  GlTable,
  GlTabs,
  GlCard,
  GlAlert,
  GlEmptyState,
  GlSkeletonLoading,
  GlModal,
} from "@gitlab/ui";
import { Component, Prop, Watch } from "vue-property-decorator";
import RegionText from "@/components/common/RegionText.vue";
import CloudwatchWidget from "@/components/cloudwatch/CloudwatchWidget.vue";
import { targetGroups } from "@/components/EC2/targetGroups/targetGroup";
import TargetGroupWithRegion = targetGroups.TargetGroupWithRegion;
import TagsTable from "@/components/common/TagsTable.vue";
import { Formatters } from "@/mixins/formatters";
import ELBv2Client, { TargetHealthDescriptions } from "aws-sdk/clients/elbv2";
import StateText from "@/components/common/StateText.vue";

@Component({
  components: {
    GlBadge,
    GlTabs,
    GlTab,
    GlTable,
    GlCard,
    GlAlert,
    GlEmptyState,
    GlSkeletonLoading,
    GlModal,
    RegionText,
    CloudwatchWidget,
    TagsTable,
    StateText,
  },
})
export default class TargetGroup extends Formatters {
  @Prop(Object) readonly targetGroup!: TargetGroupWithRegion;

  targets: TargetHealthDescriptions | undefined = [];
  targetsState: "loading" | "loaded" | "empty" | "error" = "loading";
  targetsError: string | undefined;

  get targetsFlatten() {
    return this.targets?.map((t) => {
      return {
        HealthCheckPort: t.HealthCheckPort,
        Target: t.Target?.Id,
        Port: t.Target?.Port,
        AvailabilityZone: t.Target?.AvailabilityZone,
        State: t.TargetHealth?.State,
        Description: t.TargetHealth?.Description,
        Reason: t.TargetHealth?.Reason,
      };
    });
  }

  describeTargets() {
    if (!this.targetGroup.TargetGroupArn) {
      return;
    }

    const ELBv2 = new ELBv2Client({
      region: this.targetGroup.region,
      credentials: this.$store.getters["sts/credentials"],
    });

    this.targetsState = "loading";
    this.targets = [];
    this.targetsError = "";

    const params = {
      TargetGroupArn: this.targetGroup.TargetGroupArn,
    };

    ELBv2.describeTargetHealth(params, (err, data) => {
      if (err) {
        this.targetsError = err.message;
        this.targetsState = "error";
      } else {
        this.targets = data.TargetHealthDescriptions;
        this.targetsError = undefined;
        this.targetsState =
          this.targets === undefined || this.targets.length === 0
            ? "empty"
            : "loaded";
      }
    });
  }

  extractLBName(lbArn: string): string {
    const splitted = lbArn.split("/");
    return splitted[splitted.length - 2];
  }

  @Watch("targetGroup")
  onTargetGroupChanged() {
    this.describeTargets();
  }

  // get defaultCloudwatchMetric() {
  //   if (!this.targetGroup.TargetGroupArn) {
  //     return {};
  //   }
  //
  //   const namespace =
  //     this.targetGroup.Type === "application"
  //       ? "AWS/ApplicationELB"
  //       : "AWS/NetworkELB";
  //
  //   const splittedArn = this.targetGroup.TargetGroupArn.split("/");
  //   const metricName = `${splittedArn[1]}/${splittedArn[2]}/${splittedArn[3]}`;
  //
  //   return {
  //     Namespace: namespace,
  //     Dimensions: [
  //       {
  //         Name: "TargetGroup",
  //         Value: metricName,
  //       },
  //     ],
  //   };
  // }

  // createMetrics(metricName: string) {
  //   return [
  //     Object.assign({}, this.defaultCloudwatchMetric, {
  //       MetricName: metricName,
  //     }),
  //   ];
  // }

  // get cloudwatchWidgets() {
  //   if (this.targetGroup.Type === "application") {
  //     return [
  //       {
  //         metrics: this.createMetrics("TargetResponseTime"),
  //         stat: "Average",
  //         graphTitle: "Target response time",
  //         yAxis: { name: "Milliseconds" },
  //       },
  //       {
  //         metrics: this.createMetrics("RequestCount"),
  //         stat: "Sum",
  //         graphTitle: "Requests",
  //         yAxis: { name: "Count" },
  //       },
  //       {
  //         metrics: this.createMetrics("RuleEvaluations"),
  //         stat: "Sum",
  //         graphTitle: "Rule evaluations",
  //         yAxis: { name: "Count" },
  //       },
  //       {
  //         metrics: this.createMetrics("HTTPCode_Target_5XX_Count"),
  //         stat: "Sum",
  //         graphTitle: "HTTP 5XXs",
  //         yAxis: { name: "Count" },
  //       },
  //       {
  //         metrics: this.createMetrics("HTTPCode_Target_4XX_Count"),
  //         stat: "Sum",
  //         graphTitle: "HTTP 4XXs",
  //         yAxis: { name: "Count" },
  //       },
  //       {
  //         metrics: this.createMetrics("HTTPCode_ELB_5XX_Count"),
  //         stat: "Sum",
  //         graphTitle: "ELB 5XXs",
  //         yAxis: { name: "Count" },
  //       },
  //       {
  //         metrics: this.createMetrics("HTTPCode_ELB_4XX_Count"),
  //         stat: "Sum",
  //         graphTitle: "ELB 4XXs",
  //         yAxis: { name: "Count" },
  //       },
  //       {
  //         metrics: this.createMetrics("HTTPCode_Target_500_Count"),
  //         stat: "Sum",
  //         graphTitle: "HTTP 500s",
  //         yAxis: { name: "Count" },
  //       },
  //       {
  //         metrics: this.createMetrics("HTTPCode_Target_502_Count"),
  //         stat: "Sum",
  //         graphTitle: "HTTP 502s",
  //         yAxis: { name: "Count" },
  //       },
  //       {
  //         metrics: this.createMetrics("HTTPCode_Target_503_Count"),
  //         stat: "Sum",
  //         graphTitle: "HTTP 503s",
  //         yAxis: { name: "Count" },
  //       },
  //       {
  //         metrics: this.createMetrics("HTTPCode_Target_504_Count"),
  //         stat: "Sum",
  //         graphTitle: "HTTP 5xxs",
  //         yAxis: { name: "Count" },
  //       },
  //       {
  //         metrics: this.createMetrics("TargetConnectionErrors"),
  //         stat: "Sum",
  //         graphTitle: "Target connection errors",
  //         yAxis: { name: "Count" },
  //       },
  //       {
  //         metrics: this.createMetrics("SumRejectedConnections"),
  //         stat: "Sum",
  //         graphTitle: "Sum rejected connections",
  //         yAxis: { name: "Count" },
  //       },
  //       // {
  //       //   metrics: this.createMetrics("RuleEvaluations"),
  //       //   stat: "ASD",
  //       //   graphTitle: "ASD",
  //       //   yAxis: { name: "Count" },
  //       // },
  //       // {
  //       //   metrics: this.createMetrics("RuleEvaluations"),
  //       //   stat: "ASD",
  //       //   graphTitle: "ASD",
  //       //   yAxis: { name: "Count" },
  //       // },
  //       // {
  //       //   metrics: this.createMetrics("RuleEvaluations"),
  //       //   stat: "ASD",
  //       //   graphTitle: "ASD",
  //       //   yAxis: { name: "Count" },
  //       // },
  //       // {
  //       //   metrics: this.createMetrics("RuleEvaluations"),
  //       //   stat: "ASD",
  //       //   graphTitle: "ASD",
  //       //   yAxis: { name: "Count" },
  //       // },
  //       // {
  //       //   metrics: this.createMetrics("RuleEvaluations"),
  //       //   stat: "ASD",
  //       //   graphTitle: "ASD",
  //       //   yAxis: { name: "Count" },
  //       // },
  //       // {
  //       //   metrics: this.createMetrics("RuleEvaluations"),
  //       //   stat: "ASD",
  //       //   graphTitle: "ASD",
  //       //   yAxis: { name: "Count" },
  //       // },
  //       // {
  //       //   metrics: this.createMetrics("RuleEvaluations"),
  //       //   stat: "ASD",
  //       //   graphTitle: "ASD",
  //       //   yAxis: { name: "Bytes" },
  //       // },
  //       // {
  //       //   metrics: this.createMetrics("RuleEvaluations"),
  //       //   stat: "ASD",
  //       //   graphTitle: "ASD",
  //       //   yAxis: { name: "Count" },
  //       // },
  //       // {
  //       //   metrics: this.createMetrics("RuleEvaluations"),
  //       //   stat: "ASD",
  //       //   graphTitle: "ASD",
  //       //   yAxis: { name: "Count" },
  //       // },
  //       // {
  //       //   metrics: this.createMetrics("RuleEvaluations"),
  //       //   stat: "ASD",
  //       //   graphTitle: "ASD",
  //       //   yAxis: { name: "Count" },
  //       // },
  //     ];
  //   }
  //
  //   return [
  //     {
  //       metrics: this.createMetrics("ActiveFlowCount"),
  //       stat: "Sum",
  //       graphTitle: "Active flow count",
  //       yAxis: { name: "Count" },
  //     },
  //     {
  //       metrics: this.createMetrics("NewFlowCount"),
  //       stat: "Sum",
  //       graphTitle: "New flow count",
  //       yAxis: { name: "Count" },
  //     },
  //     {
  //       metrics: this.createMetrics("ConsumedLCUs"),
  //       stat: "Sum",
  //       graphTitle: "Consumed capacity unites",
  //       yAxis: { name: "Count" },
  //     },
  //     {
  //       metrics: this.createMetrics("TCP_ELB_Reset_Count"),
  //       stat: "Sum",
  //       graphTitle: "Load balancer reset count",
  //       yAxis: { name: "Count" },
  //     },
  //     {
  //       metrics: this.createMetrics("TCP_Client_Reset_Count"),
  //       stat: "Sum",
  //       graphTitle: "Client reset count",
  //       yAxis: { name: "Count" },
  //     },
  //     {
  //       metrics: this.createMetrics("TCP_Target_Reset_Count"),
  //       stat: "Sum",
  //       graphTitle: "Target reset count",
  //       yAxis: { name: "Count" },
  //     },
  //     {
  //       metrics: this.createMetrics("ProcessedBytes"),
  //       stat: "Sum",
  //       graphTitle: "Processed bytes",
  //       yAxis: { name: "Bytes" },
  //     },
  //   ];
  // }
}
</script>

<style scoped></style>
