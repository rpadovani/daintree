<template>
  <div v-if="loadBalancer">
    <gl-modal
      modal-id="elb-certificates"
      title="Certificates"
      ref="certificateModal"
    >
      <gl-table :items="certificates" />
    </gl-modal>

    <div class="col">
      <div class="row">
        <gl-badge v-if="loadBalancer.State" :variant="badgeVariant">{{
          loadBalancer.State.Code
        }}</gl-badge>

        <gl-badge class="ml-1" variant="info">{{
          loadBalancer.Scheme
        }}</gl-badge>

        <gl-badge
          class="ml-1"
          :variant="loadBalancer.Type === 'application' ? 'light' : 'dark'"
          >{{ loadBalancer.Type }}
        </gl-badge>
      </div>
    </div>
    <gl-tabs theme="blue">
      <gl-tab title="Overview">
        <div class="row justify-content-around mt-3">
          <gl-card class="col-3" title="Availability zones">
            <RegionText
              v-for="az in loadBalancer.AvailabilityZones"
              :key="az.ZoneName"
              :region="az.ZoneName"
              is-az
              class="pt-2"
            />
          </gl-card>
          <gl-card class="col-3" title="VPC ID">
            <router-link :to="`/network/vpcs?vpcId=${loadBalancer.VpcId}`">
              {{ loadBalancer.VpcId }}
            </router-link>
          </gl-card>
          <gl-card class="col-3" title="Subnet IDs">
            <router-link
              v-for="az in loadBalancer.AvailabilityZones"
              :key="az.ZoneName"
              :to="`/network/subnets?subnetId=${az.SubnetId}`"
              class="pt-2"
            >
              {{ az.SubnetId }}
            </router-link>
          </gl-card>
        </div>
        <div class="row justify-content-around mt-3">
          <gl-card class="col-3" title="DNS Name">{{
            loadBalancer.DNSName
          }}</gl-card>
          <gl-card class="col-3" title="Creation time">{{
            loadBalancer.CreatedTime | standardDate
          }}</gl-card>
          <gl-card class="col-3" title="Hosted Zone ID">{{
            loadBalancer.CanonicalHostedZoneId
          }}</gl-card>
        </div>

        <h5 class="mt-2">Tags</h5>
        <TagsTable
          :key="loadBalancer.LoadBalancerArn"
          :region="loadBalancer.region"
          :resource-id="loadBalancer.LoadBalancerArn"
          provider="ELB"
        />
      </gl-tab>
      <gl-tab title="Security" v-if="loadBalancer.Type === 'application'">
        <h6>Associated security groups</h6>
        <ul>
          <li v-for="s in loadBalancer.SecurityGroups" :key="s">
            <router-link :to="`/network/securityGroups?securityGroupId=${s}`">
              {{ s }}
            </router-link>
          </li>
        </ul>
      </gl-tab>
      <gl-tab title="Listeners" @click="describeListeners">
        <gl-alert
          v-if="listenersState === 'error'"
          variant="danger"
          :dismissible="false"
          >{{ listenersError }}
        </gl-alert>
        <gl-skeleton-loading v-if="listenersState === 'loading'" />

        <gl-table :items="listeners" :fields="listenersFields">
          <template v-slot:cell(Certificates)="data">
            <a
              href="#"
              @click="() => showCertificates(data.item.ListenerArn)"
              v-if="data.value.length && data.value.length > 0"
            >
              {{ data.value.length }} certificates
            </a>
            <span v-else>N/A</span>
          </template>

          <template v-slot:cell(SslPolicy)="data">
            <span v-if="data.value">{{ data.value }}</span>
            <span v-else>N/A</span>
          </template>

          <template v-slot:cell(DefaultActions)="data">
            Default: <b>{{ data.value[0].Type }}</b> to
            <router-link
              v-if="data.value[0].Type === 'forward'"
              :to="`/ec2/targetGroups?targetGroupArn=${data.value[0].TargetGroupArn}`"
            >
              {{ extractTGName(data.value[0].TargetGroupArn) }}
            </router-link>
            <b v-else-if="data.value[0].Type === 'redirect'">
              {{ calculateRedirectLink(data.value[0].RedirectConfig) }}
            </b>
          </template>
        </gl-table>

        <gl-empty-state
          v-if="listenersState === 'empty'"
          title="No related listeners"
          svg-path="/assets/undraw_empty_xct9.svg"
          description="Daintree hasn't found any listener associated to this load balancer!"
          compact
        />
      </gl-tab>
      <gl-tab title="Monitoring">
        <div class="row justify-content-between">
          <CloudwatchWidget
            class="col-12 col-md-6 col-lg-4"
            v-for="widget in cloudwatchWidgets"
            :metrics="widget.metrics"
            :live-data="false"
            :stat="widget.stat"
            :region="loadBalancer.region"
            :key="widget.graphTitle + loadBalancer.LoadBalancerArn"
            :legend="{ position: 'hidden' }"
            :graph-title="widget.graphTitle"
            :label="
              loadBalancer.LoadBalancerName || loadBalancer.LoadBalancerArn
            "
            :y-axis="widget.yAxis"
          />
        </div>
      </gl-tab>
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
import { Component, Prop, Ref, Watch } from "vue-property-decorator";
import RegionText from "@/components/common/RegionText.vue";
import CloudwatchWidget from "@/components/cloudwatch/CloudwatchWidget.vue";
import { loadBalancers } from "@/components/EC2/loadBalancers/loadBalancer";
import LoadBalancerWithRegion = loadBalancers.LoadBalancerWithRegion;
import TagsTable from "@/components/common/TagsTable.vue";
import { Formatters } from "@/mixins/formatters";
import ELBv2Client, {
  Certificate,
  Listener,
  RedirectActionConfig,
} from "aws-sdk/clients/elbv2";
import { BvModal } from "bootstrap-vue";

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
  },
})
export default class LoadBalancer extends Formatters {
  @Prop(Object) readonly loadBalancer!: LoadBalancerWithRegion;

  @Ref() readonly certificateModal!: BvModal;

  get badgeVariant() {
    switch (this.loadBalancer.State?.Code) {
      case "provisioning":
        return "warning";
      case "active":
        return "success";
      case "active_impaired":
      case "failed":
        return "danger";
      default:
        return "secondary";
    }
  }

  listeners: Listener[] | undefined = [];
  listenersState: "loading" | "loaded" | "empty" | "error" = "loading";
  listenersError: string | undefined;
  listenersFields = [
    { key: "Port", sortable: true },
    { key: "Protocol", sortable: true },
    { key: "Certificates", label: "# certificates" },
    "SslPolicy",
    { key: "DefaultActions", label: "Default action" },
  ];

  describeListeners() {
    const ELBv2 = new ELBv2Client({
      region: this.loadBalancer.region,
      credentials: this.$store.getters["sts/credentials"],
    });

    this.listenersState = "loading";
    this.listeners = [];
    this.listenersError = "";

    const params = {
      LoadBalancerArn: this.loadBalancer.LoadBalancerArn,
    };

    ELBv2.describeListeners(params, (err, data) => {
      if (err) {
        this.listenersError = err.message;
        this.listenersState = "error";
      } else {
        this.listeners = data.Listeners;
        this.listenersError = undefined;
        this.listenersState =
          this.listeners === undefined || this.listeners.length === 0
            ? "empty"
            : "loaded";
      }
    });
  }

  @Watch("loadBalancer")
  onLoadBalancerChanged() {
    this.describeListeners();
  }

  currentListenerArn = "";
  certificates: Certificate[] | undefined = [];
  certificatesState: "loading" | "loaded" | "empty" | "error" = "loading";
  certificatesError: string | undefined;
  certificatesFields = [
    { key: "Port", sortable: true },
    { key: "Protocol", sortable: true },
    { key: "Certificates", label: "# certificates" },
    "SslPolicy",
    "DefaultActions",
  ];

  describeCertificates(listenerArn: string) {
    if (listenerArn === this.currentListenerArn) {
      return;
    }
    this.currentListenerArn = "";
    const ELBv2 = new ELBv2Client({
      region: this.loadBalancer.region,
      credentials: this.$store.getters["sts/credentials"],
    });

    this.certificatesState = "loading";
    this.certificates = [];
    this.certificatesError = "";

    const params = {
      ListenerArn: listenerArn,
    };

    ELBv2.describeListenerCertificates(params, (err, data) => {
      if (err) {
        this.certificatesError = err.message;
        this.certificatesState = "error";
      } else {
        this.currentListenerArn = listenerArn;

        this.certificates = data.Certificates;
        this.certificatesError = undefined;
        this.certificatesState =
          this.certificates === undefined || this.certificates.length === 0
            ? "empty"
            : "loaded";
      }
    });
  }

  showCertificates(listenerArn: string) {
    this.certificateModal.show("elb-certificate");
    this.describeCertificates(listenerArn);
  }

  extractTGName(tgArn: string): string {
    const splitted = tgArn.split("/");
    return splitted[splitted.length - 2];
  }

  calculateRedirectLink(action: RedirectActionConfig): string {
    return `${action.Protocol}://${action.Host}:${action.Port}${action.Path}?${action.Query}`;
  }

  get defaultCloudwatchMetric() {
    if (!this.loadBalancer.LoadBalancerArn) {
      return {};
    }

    const namespace =
      this.loadBalancer.Type === "application"
        ? "AWS/ApplicationELB"
        : "AWS/NetworkELB";

    const splittedArn = this.loadBalancer.LoadBalancerArn.split("/");
    const metricName = `${splittedArn[1]}/${splittedArn[2]}/${splittedArn[3]}`;

    return {
      Namespace: namespace,
      Dimensions: [
        {
          Name: "LoadBalancer",
          Value: metricName,
        },
      ],
    };
  }

  createMetrics(metricName: string) {
    return [
      Object.assign({}, this.defaultCloudwatchMetric, {
        MetricName: metricName,
      }),
    ];
  }

  get cloudwatchWidgets() {
    if (this.loadBalancer.Type === "application") {
      return [
        {
          metrics: this.createMetrics("TargetResponseTime"),
          stat: "Average",
          graphTitle: "Target response time",
          yAxis: { name: "Milliseconds" },
        },
        {
          metrics: this.createMetrics("RequestCount"),
          stat: "Sum",
          graphTitle: "Requests",
          yAxis: { name: "Count" },
        },
        {
          metrics: this.createMetrics("RuleEvaluations"),
          stat: "Sum",
          graphTitle: "Rule evaluations",
          yAxis: { name: "Count" },
        },
        {
          metrics: this.createMetrics("HTTPCode_Target_5XX_Count"),
          stat: "Sum",
          graphTitle: "HTTP 5XXs",
          yAxis: { name: "Count" },
        },
        {
          metrics: this.createMetrics("HTTPCode_Target_4XX_Count"),
          stat: "Sum",
          graphTitle: "HTTP 4XXs",
          yAxis: { name: "Count" },
        },
        {
          metrics: this.createMetrics("HTTPCode_ELB_5XX_Count"),
          stat: "Sum",
          graphTitle: "ELB 5XXs",
          yAxis: { name: "Count" },
        },
        {
          metrics: this.createMetrics("HTTPCode_ELB_4XX_Count"),
          stat: "Sum",
          graphTitle: "ELB 4XXs",
          yAxis: { name: "Count" },
        },
        {
          metrics: this.createMetrics("HTTPCode_Target_500_Count"),
          stat: "Sum",
          graphTitle: "HTTP 500s",
          yAxis: { name: "Count" },
        },
        {
          metrics: this.createMetrics("HTTPCode_Target_502_Count"),
          stat: "Sum",
          graphTitle: "HTTP 502s",
          yAxis: { name: "Count" },
        },
        {
          metrics: this.createMetrics("HTTPCode_Target_503_Count"),
          stat: "Sum",
          graphTitle: "HTTP 503s",
          yAxis: { name: "Count" },
        },
        {
          metrics: this.createMetrics("HTTPCode_Target_504_Count"),
          stat: "Sum",
          graphTitle: "HTTP 5xxs",
          yAxis: { name: "Count" },
        },
        {
          metrics: this.createMetrics("TargetConnectionErrors"),
          stat: "Sum",
          graphTitle: "Target connection errors",
          yAxis: { name: "Count" },
        },
        {
          metrics: this.createMetrics("SumRejectedConnections"),
          stat: "Sum",
          graphTitle: "Sum rejected connections",
          yAxis: { name: "Count" },
        },
        // {
        //   metrics: this.createMetrics("RuleEvaluations"),
        //   stat: "ASD",
        //   graphTitle: "ASD",
        //   yAxis: { name: "Count" },
        // },
        // {
        //   metrics: this.createMetrics("RuleEvaluations"),
        //   stat: "ASD",
        //   graphTitle: "ASD",
        //   yAxis: { name: "Count" },
        // },
        // {
        //   metrics: this.createMetrics("RuleEvaluations"),
        //   stat: "ASD",
        //   graphTitle: "ASD",
        //   yAxis: { name: "Count" },
        // },
        // {
        //   metrics: this.createMetrics("RuleEvaluations"),
        //   stat: "ASD",
        //   graphTitle: "ASD",
        //   yAxis: { name: "Count" },
        // },
        // {
        //   metrics: this.createMetrics("RuleEvaluations"),
        //   stat: "ASD",
        //   graphTitle: "ASD",
        //   yAxis: { name: "Count" },
        // },
        // {
        //   metrics: this.createMetrics("RuleEvaluations"),
        //   stat: "ASD",
        //   graphTitle: "ASD",
        //   yAxis: { name: "Count" },
        // },
        // {
        //   metrics: this.createMetrics("RuleEvaluations"),
        //   stat: "ASD",
        //   graphTitle: "ASD",
        //   yAxis: { name: "Bytes" },
        // },
        // {
        //   metrics: this.createMetrics("RuleEvaluations"),
        //   stat: "ASD",
        //   graphTitle: "ASD",
        //   yAxis: { name: "Count" },
        // },
        // {
        //   metrics: this.createMetrics("RuleEvaluations"),
        //   stat: "ASD",
        //   graphTitle: "ASD",
        //   yAxis: { name: "Count" },
        // },
        // {
        //   metrics: this.createMetrics("RuleEvaluations"),
        //   stat: "ASD",
        //   graphTitle: "ASD",
        //   yAxis: { name: "Count" },
        // },
      ];
    }

    return [
      {
        metrics: this.createMetrics("ActiveFlowCount"),
        stat: "Sum",
        graphTitle: "Active flow count",
        yAxis: { name: "Count" },
      },
      {
        metrics: this.createMetrics("NewFlowCount"),
        stat: "Sum",
        graphTitle: "New flow count",
        yAxis: { name: "Count" },
      },
      {
        metrics: this.createMetrics("ConsumedLCUs"),
        stat: "Sum",
        graphTitle: "Consumed capacity unites",
        yAxis: { name: "Count" },
      },
      {
        metrics: this.createMetrics("TCP_ELB_Reset_Count"),
        stat: "Sum",
        graphTitle: "Load balancer reset count",
        yAxis: { name: "Count" },
      },
      {
        metrics: this.createMetrics("TCP_Client_Reset_Count"),
        stat: "Sum",
        graphTitle: "Client reset count",
        yAxis: { name: "Count" },
      },
      {
        metrics: this.createMetrics("TCP_Target_Reset_Count"),
        stat: "Sum",
        graphTitle: "Target reset count",
        yAxis: { name: "Count" },
      },
      {
        metrics: this.createMetrics("ProcessedBytes"),
        stat: "Sum",
        graphTitle: "Processed bytes",
        yAxis: { name: "Bytes" },
      },
    ];
  }
}
</script>

<style scoped></style>
