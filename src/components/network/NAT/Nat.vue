<template>
  <gl-tabs theme="blue" v-if="nat" class="mt-n3" lazy>
    <gl-tab title="Overview">
      <gl-modal
        modal-id="delete-nat-modal"
        title="Delete NAT gateway"
        no-fade
        :action-primary="deleteNatButtonProps"
        :action-cancel="cancelProps"
        @primary="deleteNat"
      >
        Are you sure that you want to delete this NAT gateway?
      </gl-modal>
      <div class="row justify-content-between">
        <gl-alert :variant="alertVariant" :dismissible="false" class="col-9">
          <b>{{ nat.State }}</b>
        </gl-alert>
        <gl-button
          style="height: 100%;"
          class="mt-2 col-2"
          variant="danger"
          category="secondary"
          :disabled="nat.State !== 'available'"
          v-gl-modal-directive="'delete-nat-modal'"
          >Delete this NAT Gateway</gl-button
        >
      </div>
      <div class="row justify-content-around mt-3">
        <gl-card class="col-3" title="VPC ID">
          <router-link :to="`/network/vpcs?vpcId=${nat.VpcId}`">
            {{ nat.VpcId }}
          </router-link>
        </gl-card>

        <gl-card class="col-3" title="Subnet ID">
          <router-link :to="`/network/subnets?subnetId=${nat.SubnetId}`">
            {{ nat.SubnetId }}
          </router-link>
        </gl-card>

        <gl-card class="col-3" title="Create time">
          {{ nat.CreateTime | standardDate }}
        </gl-card>
      </div>
      <div class="row mt-2 justify-content-around">
        <gl-card class="col-3" title="Public IP">
          <router-link
            :to="`/network/eips?allocationId=${nat.NatGatewayAddresses[0].AllocationId}`"
          >
            {{ nat.NatGatewayAddresses[0].PublicIp }}
          </router-link>
        </gl-card>

        <gl-card class="col-3" title="Private Ip">
          <router-link
            :to="`/network/eips?allocationId=${nat.NatGatewayAddresses[0].AllocationId}`"
          >
            {{ nat.NatGatewayAddresses[0].PrivateIp }}
          </router-link>
        </gl-card>

        <gl-card class="col-3" title="Network Interface ID">
          <router-link
            :to="`/network/interfaces?interfaceId=${nat.NatGatewayAddresses[0].NetworkInterfaceId}`"
          >
            {{ nat.NatGatewayAddresses[0].NetworkInterfaceId }}
          </router-link>
        </gl-card>
      </div>
      <h5 class="mt-3">Tags</h5>
      <TagsTable
        :key="nat.NatGatewayId"
        :tags="nat.Tags"
        :region="nat.region"
        :resource-id="nat.NatGatewayId"
      />
    </gl-tab>

    <gl-tab title="Monitoring">
      <div class="row justify-content-between">
        <CloudwatchWidget
          class="col-12 col-md-6 col-lg-4"
          :metrics="metricsPacketsOutToDestination"
          :live-data="false"
          stat="Average"
          :region="nat.region"
          :key="nat.NatGatewayId + 'packetsOutToDestination'"
          :legend="{ position: 'hidden' }"
          graph-title="Packets out to destination"
          :label="nat.NatGatewayId"
        />
        <CloudwatchWidget
          class="col-12 col-md-6 col-lg-4"
          :metrics="metricsPacketsOutToSource"
          :live-data="false"
          stat="Average"
          :region="nat.region"
          :key="nat.NatGatewayId + 'packetsOutToSource'"
          :legend="{ position: 'hidden' }"
          graph-title="Packets out to source"
          :label="nat.NatGatewayId"
        />
        <CloudwatchWidget
          class="col-12 col-md-6 col-lg-4"
          :metrics="metricsPacketsDrop"
          :live-data="false"
          stat="Average"
          :region="nat.region"
          :key="nat.NatGatewayId + 'packetsDrop'"
          :legend="{ position: 'hidden' }"
          graph-title="Packets drop"
          :label="nat.NatGatewayId"
        />
      </div>

      <div class="row justify-content-between">
        <CloudwatchWidget
          class="col-12 col-md-6 col-lg-4"
          :metrics="metricsBytesOutToDestination"
          :live-data="false"
          stat="Average"
          :region="nat.region"
          :key="nat.NatGatewayId + 'bytesOutToDestination'"
          :legend="{ position: 'hidden' }"
          graph-title="Bytes out to destination"
          :label="nat.NatGatewayId"
          :y-axis="{ name: 'Bytes' }"
        />
        <CloudwatchWidget
          class="col-12 col-md-6 col-lg-4"
          :metrics="metricsBytesOutToSource"
          :live-data="false"
          stat="Average"
          :region="nat.region"
          :key="nat.NatGatewayId + 'bytesOutToSource'"
          :legend="{ position: 'hidden' }"
          graph-title="Bytes out to source"
          :label="nat.NatGatewayId"
          :y-axis="{ name: 'Bytes' }"
        />
        <CloudwatchWidget
          class="col-12 col-md-6 col-lg-4"
          :metrics="metricsActiveConnection"
          :live-data="false"
          stat="Average"
          :region="nat.region"
          :key="nat.NatGatewayId + 'activeConnection'"
          :legend="{ position: 'hidden' }"
          graph-title="Active connections"
          :label="nat.NatGatewayId"
        />
      </div>

      <div class="row justify-content-between">
        <CloudwatchWidget
          class="col-12 col-md-6 col-lg-4"
          :metrics="metricsConnectionAttempt"
          :live-data="false"
          stat="Average"
          :region="nat.region"
          :key="nat.NatGatewayId + 'connectionAttempt'"
          :legend="{ position: 'hidden' }"
          graph-title="Connection attempt"
          :label="nat.NatGatewayId"
        />
        <CloudwatchWidget
          class="col-12 col-md-6 col-lg-4"
          :metrics="metricsConnectionEstablished"
          :live-data="false"
          stat="Average"
          :region="nat.region"
          :key="nat.NatGatewayId + 'connectionEstablished'"
          :legend="{ position: 'hidden' }"
          graph-title="Connection established"
          :label="nat.NatGatewayId"
        />
        <CloudwatchWidget
          class="col-12 col-md-6 col-lg-4"
          :metrics="metricsErrorPortAllocation"
          :live-data="false"
          stat="Average"
          :region="nat.region"
          :key="nat.NatGatewayId + 'errorPortAllocation'"
          :legend="{ position: 'hidden' }"
          graph-title="Error port allocation"
          :label="nat.NatGatewayId"
        />
      </div>
    </gl-tab>

    <gl-tab title="Route tables">
      <RelatedRoutesTable
        :region="nat.region"
        filter-key="route.nat-gateway-id"
        :filter-value="nat.NatGatewayId"
      />
    </gl-tab>
  </gl-tabs>
</template>

<script lang="ts">
import {
  GlTable,
  GlCard,
  GlAlert,
  GlButton,
  GlModal,
  GlModalDirective,
  GlTabs,
  GlTab,
} from "@gitlab/ui";
import { Formatters } from "@/mixins/formatters";
import { Prop, Component } from "vue-property-decorator";
import { nats } from "@/components/network/NAT/nat";
import NatWithRegion = nats.NatWithRegion;
import TagsTable from "@/components/common/TagsTable.vue";
import EC2Client from "aws-sdk/clients/ec2";
import { mixins } from "vue-class-component";
import Notifications from "@/mixins/notifications";
import CloudwatchWidget from "@/components/cloudwatch/CloudwatchWidget.vue";
import { Metric } from "aws-sdk/clients/cloudwatch";
import RelatedRoutesTable from "@/components/network/routeTables/RelatedRoutesTable.vue";

@Component({
  components: {
    RelatedRoutesTable,
    TagsTable,
    GlTable,
    GlCard,
    GlAlert,
    GlButton,
    GlModal,
    GlTabs,
    GlTab,
    CloudwatchWidget,
  },
  directives: { "gl-modal-directive": GlModalDirective },
})
export default class Nat extends mixins(Formatters, Notifications) {
  @Prop(Object) readonly nat!: NatWithRegion;

  deleteNatButtonProps = {
    text: "Delete NAT Gateway",
  };

  cancelProps = {
    text: "Cancel",
  };

  get metricsPacketsOutToDestination(): Metric[] {
    return [
      {
        Namespace: "AWS/NATGateway",
        MetricName: "PacketsOutToDestination",
        Dimensions: [
          { Name: "NatGatewayId", Value: this.nat.NatGatewayId || "" },
        ],
      },
    ];
  }

  get metricsPacketsOutToSource(): Metric[] {
    return [
      {
        Namespace: "AWS/NATGateway",
        MetricName: "PacketsOutToSource",
        Dimensions: [
          { Name: "NatGatewayId", Value: this.nat.NatGatewayId || "" },
        ],
      },
    ];
  }

  get metricsPacketsDrop(): Metric[] {
    return [
      {
        Namespace: "AWS/NATGateway",
        MetricName: "PacketsDrop",
        Dimensions: [
          { Name: "NatGatewayId", Value: this.nat.NatGatewayId || "" },
        ],
      },
    ];
  }

  get metricsBytesOutToDestination(): Metric[] {
    return [
      {
        Namespace: "AWS/NATGateway",
        MetricName: "BytesOutToDestination",
        Dimensions: [
          { Name: "NatGatewayId", Value: this.nat.NatGatewayId || "" },
        ],
      },
    ];
  }

  get metricsBytesOutToSource(): Metric[] {
    return [
      {
        Namespace: "AWS/NATGateway",
        MetricName: "BytesOutToSource",
        Dimensions: [
          { Name: "NatGatewayId", Value: this.nat.NatGatewayId || "" },
        ],
      },
    ];
  }

  get metricsActiveConnection(): Metric[] {
    return [
      {
        Namespace: "AWS/NATGateway",
        MetricName: "ActiveConnectionCount",
        Dimensions: [
          { Name: "NatGatewayId", Value: this.nat.NatGatewayId || "" },
        ],
      },
    ];
  }

  get metricsConnectionAttempt(): Metric[] {
    return [
      {
        Namespace: "AWS/NATGateway",
        MetricName: "ConnectionAttemptCount",
        Dimensions: [
          { Name: "NatGatewayId", Value: this.nat.NatGatewayId || "" },
        ],
      },
    ];
  }

  get metricsConnectionEstablished(): Metric[] {
    return [
      {
        Namespace: "AWS/NATGateway",
        MetricName: "ConnectionEstablishedCount",
        Dimensions: [
          { Name: "NatGatewayId", Value: this.nat.NatGatewayId || "" },
        ],
      },
    ];
  }

  get metricsErrorPortAllocation(): Metric[] {
    return [
      {
        Namespace: "AWS/NATGateway",
        MetricName: "ErrorPortAllocation",
        Dimensions: [
          { Name: "NatGatewayId", Value: this.nat.NatGatewayId || "" },
        ],
      },
    ];
  }

  get alertVariant() {
    switch (this.nat.State) {
      case "available":
        return "success";
      case "pending":
      case "deleting":
        return "info";
      case "failed":
        return "danger";
      case "deleted":
        return "tip";
    }

    return "info";
  }

  get credentials() {
    return this.$store.getters["sts/credentials"];
  }

  deleteNat() {
    if (!this.nat.NatGatewayId) {
      return;
    }

    const EC2 = new EC2Client({
      region: this.nat.region,
      credentials: this.credentials,
    });
    EC2.deleteNatGateway(
      { NatGatewayId: this.nat.NatGatewayId },
      (err, data) => {
        if (err) {
          this.showError(err.message, "deleteNat");
        } else {
          this.hideErrors("deleteNat");
          this.showAlert({
            variant: "info",
            text: "Deleting Nat Gateway with ID " + data.NatGatewayId,
            key: "deletingNat",
            resourceId: data.NatGatewayId,
          });
          this.$emit("deleted");
        }
      }
    );
  }
}
</script>

<style scoped></style>
