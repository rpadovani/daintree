<template>
  <gl-tabs theme="blue" v-if="nat" class="mt-n3" lazy>
    <gl-tab title="Overview">
      <div class="row justify-content-between">
        <gl-alert :variant="alertVariant" :dismissible="false" class="col-9">
          <b>{{ nat.State }}</b>
        </gl-alert>

        <DeleteButtonWithConfirmation
          style="height: 100%"
          class="mt-2 col-2"
          resource-type="NAT Gateway"
          :resource-id="nat.NatGatewayId"
          :resource-name="resourceName"
          @primary="deleteNat"
          :disabled="nat.State !== 'available'"
        />
      </div>

      <DrawerCards :cards="cards" />

      <h5 class="mt-3">Tags</h5>
      <TagsTable
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
import { GlAlert, GlTabs, GlTab } from "@gitlab/ui";
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
import { CardContent } from "@/components/common/cardContent";
import DrawerCards from "@/components/common/DrawerCards.vue";
import { extractNameFromEC2Tags } from "@/components/common/tags";
import DeleteButtonWithConfirmation from "@/components/common/DeleteButtonWithConfirmation.vue";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";

@Component({
  components: {
    RelatedRoutesTable,
    TagsTable,
    GlAlert,
    GlTabs,
    GlTab,
    CloudwatchWidget,
    DrawerCards,
    DeleteButtonWithConfirmation,
  },
})
export default class Nat extends DaintreeComponent {
  @Prop(Object) readonly nat!: NatWithRegion;

  get resourceName(): string | undefined {
    return extractNameFromEC2Tags(this.nat.Tags);
  }

  get createTime(): string | undefined {
    if (this.nat.CreateTime) {
      return this.standardDate(this.nat.CreateTime);
    }

    return undefined;
  }

  get allocationId(): string | undefined {
    if (
      this.nat.NatGatewayAddresses &&
      this.nat.NatGatewayAddresses?.length > 0 &&
      this.nat.NatGatewayAddresses[0].AllocationId
    ) {
      return this.nat.NatGatewayAddresses[0].AllocationId;
    }

    return undefined;
  }

  get publicIp(): string | undefined {
    if (
      this.nat.NatGatewayAddresses &&
      this.nat.NatGatewayAddresses?.length > 0 &&
      this.nat.NatGatewayAddresses[0].AllocationId
    ) {
      return this.nat.NatGatewayAddresses[0].PublicIp;
    }

    return undefined;
  }

  get privateIp(): string | undefined {
    if (
      this.nat.NatGatewayAddresses &&
      this.nat.NatGatewayAddresses?.length > 0 &&
      this.nat.NatGatewayAddresses[0].AllocationId
    ) {
      return this.nat.NatGatewayAddresses[0].PrivateIp;
    }

    return undefined;
  }

  get networkInterfaceId(): string | undefined {
    if (
      this.nat.NatGatewayAddresses &&
      this.nat.NatGatewayAddresses?.length > 0 &&
      this.nat.NatGatewayAddresses[0].AllocationId
    ) {
      return this.nat.NatGatewayAddresses[0].NetworkInterfaceId;
    }

    return undefined;
  }

  get cards(): CardContent[] {
    return [
      {
        title: "VPC ID",
        linkTo: `/network/vpcs?vpcId=${this.nat.VpcId}`,
        value: this.nat.VpcId,
        helpText: "The ID of the VPC in which the NAT gateway is located.",
      },
      {
        title: "Subnet ID",
        linkTo: `/network/subnets?subnetId=${this.nat.SubnetId}`,
        value: this.nat.SubnetId,
        helpText: "The ID of the subnet in which the NAT gateway is located.",
      },
      {
        title: "Create time",
        value: this.createTime,
        helpText: "The date and time the NAT gateway was created.",
      },
      {
        title: "Public IP",
        linkTo: `/network/eips?allocationId=${this.allocationId}`,

        value: this.publicIp,
        helpText: "The Elastic IP address associated with the NAT gateway.",
      },
      {
        title: "Private Ip",
        linkTo: `/network/eips?allocationId=${this.allocationId}`,
        value: this.privateIp,
        helpText:
          "The private IP address associated with the Elastic IP address.",
      },
      {
        title: "Network Interface ID",
        linkTo: `/network/interfaces?interfaceId=${this.networkInterfaceId}`,
        value: this.networkInterfaceId,
        helpText:
          "The ID of the network interface associated with the NAT gateway.",
      },
    ];
  }

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

  async deleteNat() {
    if (!this.nat.NatGatewayId) {
      return;
    }

    const EC2 = new EC2Client({
      region: this.nat.region,
      credentials: await this.credentials(),
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
