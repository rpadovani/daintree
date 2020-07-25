<template>
  <div v-if="targetGroup">
    <gl-tabs theme="blue">
      <gl-tab title="Overview">
        <DrawerCards :cards="overviewCards" />

        <h5 class="mt-2">Tags</h5>
        <TagsTable
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
        <DrawerCards :cards="healthCheckCards" />
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
import DrawerCards from "@/components/common/DrawerCards.vue";
import { CardContent } from "@/components/common/cardContent";

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
    DrawerCards,
  },
})
export default class TargetGroup extends Formatters {
  @Prop(Object) readonly targetGroup!: TargetGroupWithRegion;

  targets: TargetHealthDescriptions | undefined = [];
  targetsState: "loading" | "loaded" | "empty" | "error" = "loading";
  targetsError: string | undefined;

  get overviewCards(): CardContent[] {
    let htmlLoadBalancers: { to: string; text: string }[] = [];

    this.targetGroup.LoadBalancerArns?.forEach((arn) => {
      htmlLoadBalancers.push({
        to: `/ec2/loadBalancers?loadBalancerArn=${arn}`,
        text: this.extractLBName(arn),
      });
    });

    return [
      {
        title: "Protocol",
        value: this.targetGroup.Protocol,
        helpText: "The protocol to use for routing traffic to the targets.",
      },
      {
        title: "Port",
        value: this.targetGroup.Port,
        helpText: "The port on which the targets are listening.",
      },
      {
        title: "Target type",
        value: this.targetGroup.TargetType,
        helpText: "Are targets instances, IP addresses, or lambda functions?",
      },
      { title: "Region", value: this.targetGroup.region, isRegion: true },
      {
        title: "VPC ID",
        linkTo: `/network/vpcs?vpcId=${this.targetGroup.VpcId}`,
        value: this.targetGroup.VpcId,
        helpText: "The ID of the VPC for the targets.",
      },
      {
        title: "Load balancers",
        linksTo: htmlLoadBalancers,
        helpText:
          "The Amazon Resource Names (ARN) of the load balancers that route traffic to this target group.",
      },
    ];
  }

  get healthCheckCards(): CardContent[] {
    return [
      {
        title: "Protocol",
        value: this.targetGroup.Protocol,
        helpText: `The protocol to use for routing traffic to the targets.`,
      },
      {
        title: "Status",
        value:
          this.targetGroup.HealthCheckEnabled !== undefined
            ? this.targetGroup.HealthCheckEnabled
              ? "Enabled"
              : "Disabled"
            : undefined,
        helpText: `Indicates whether health checks are enabled.`,
      },
      {
        title: "Path",
        value: this.targetGroup.HealthCheckPath,
        helpText: `The destination for the health check request.`,
      },
      {
        title: "Health check port",
        value: this.targetGroup.HealthCheckPort,
        helpText: `Indicates whether health checks are enabled.`,
      },
      {
        title: "Healthy threshold",
        value: this.targetGroup.HealthyThresholdCount,
        helpText: `The number of consecutive health checks successes required before considering an unhealthy target healthy.`,
      },
      {
        title: "Unhealthy threshold",
        value: this.targetGroup.UnhealthyThresholdCount,
        helpText: `The number of consecutive health check failures required before considering the target unhealthy.`,
      },
      {
        title: "Timeout",
        value: `${this.targetGroup.HealthCheckTimeoutSeconds} seconds`,
        helpText: `The amount of time, in seconds, during which no response means a failed health check.`,
      },
      {
        title: "Interval",
        value: `${this.targetGroup.HealthCheckIntervalSeconds} seconds`,
        helpText: `The approximate amount of time, in seconds, between health checks of an individual target.`,
      },
      {
        title: "Success codes",
        value: this.targetGroup.Matcher?.HttpCode,
        helpText: `The HTTP codes. For Application Load Balancers, you can specify values between 200 and 499, and the default value is 200. You can specify multiple values (for example, "200,202") or a range of values (for example, "200-299"). For Network Load Balancers, this is 200–399.`,
      },
    ];
  }

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
