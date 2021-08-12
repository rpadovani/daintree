<template>
  <gl-tabs theme="blue" lazy>
    <gl-tab title="Overview">
      <div class="row justify-content-between">
        <gl-alert :variant="alertVariant" :dismissible="false" class="col-9">
          <b>{{ vpc.State }}</b>
        </gl-alert>

        <DeleteButtonWithConfirmation
          style="height: 100%"
          class="mt-2 col-2"
          resource-type="VPC"
          :resource-id="vpc.VpcId"
          :resource-name="resourceName"
          @primary="deleteVpc"
          :disabled="vpc.State !== 'available'"
        />
      </div>

      <DrawerCards :cards="cards" />

      <h5 class="mt-3" v-if="vpc.CidrBlockAssociationSet.length > 0">
        CIDR Block Associations
      </h5>
      <gl-table :items="vpc.CidrBlockAssociationSet">
        <template v-slot:cell(CidrBlockState)="data">
          {{ data.value.State }}
        </template>
      </gl-table>

      <h5>Tags</h5>
      <TagsTable
        :tags="vpc.Tags"
        :region="vpc.region"
        :resource-id="vpc.VpcId"
      />
    </gl-tab>
    <gl-tab title="Subnets">
      <SubnetTab
        :region="vpc.region"
        filter-name="vpc-id"
        :filter-values="[vpc.VpcId]"
      />
    </gl-tab>

    <gl-tab title="Internet Gateways" @click="describeIgws">
      <gl-alert
        v-if="igwsState === 'error'"
        variant="danger"
        :dismissible="false"
        >{{ igwsError }}
      </gl-alert>
      <gl-skeleton-loading v-if="igwsState === 'loading'" />

      <gl-table :items="igws" :fields="igwsFields">
        <template v-slot:cell(InternetGatewayId)="data">
          <router-link :to="`/network/igws?igwId=${data.value}`">
            {{ data.value }}
          </router-link>
        </template>
      </gl-table>

      <gl-empty-state
        v-if="igwsState === 'empty'"
        title="No related Internet Gateways"
        svg-path="/assets/undraw_empty_xct9.svg"
        description="Daintree hasn't found any Internet Gateway associated to this VPC!"
        compact
      />
    </gl-tab>

    <gl-tab title="Nat Gateways" @click="describeNats">
      <gl-alert
        v-if="natsState === 'error'"
        variant="danger"
        :dismissible="false"
        >{{ natsError }}
      </gl-alert>
      <gl-skeleton-loading v-if="natsState === 'loading'" />

      <gl-table
        v-if="natsState === 'loaded'"
        :items="nats"
        :fields="natsFields"
      >
        <template v-slot:cell(NatGatewayId)="data">
          <router-link :to="`/network/nats?natId=${data.value}`">
            {{ data.value }}
          </router-link>
        </template>
        <template v-slot:cell(SubnetId)="data">
          <router-link :to="`/subnets?subnetId=${data.value}`">{{
            data.value
          }}</router-link>
        </template>
      </gl-table>

      <gl-empty-state
        v-if="natsState === 'empty'"
        title="No related Nat Gateways"
        svg-path="/assets/undraw_empty_xct9.svg"
        description="Daintree hasn't found any Nat Gateway associated to this VPC!"
        compact
      />
    </gl-tab>

    <gl-tab title="Route Tables">
      <RelatedRoutesTable
        :region="vpc.region"
        filter-key="vpc-id"
        :filter-value="vpc.VpcId"
      />
    </gl-tab>

    <gl-tab title="Security groups">
      <gl-alert variant="tip" :dismissible="false">
        List of security groups created in this VPC.
      </gl-alert>

      <RelatedSecurityGroups
        :region="vpc.region"
        filter-key="vpc-id"
        :filter-value="vpc.VpcId"
      />
    </gl-tab>

    <gl-tab title="EC2 Instances">
      <gl-alert variant="tip" :dismissible="false">
        List of EC2 instances that have been deployed on this VPC.
      </gl-alert>

      <RelatedInstances
        :region="vpc.region"
        filter-key="vpc-id"
        :filter-value="vpc.VpcId"
      />
    </gl-tab>

    <gl-tab title="Network interfaces">
      <gl-alert variant="tip" :dismissible="false">
        List of network interfaces belonging to this VPC.
      </gl-alert>

      <RelatedNetworkInterfaces
        :region="vpc.region"
        filter-name="vpc-id"
        :filter-values="[vpc.VpcId]"
      />
    </gl-tab>

    <gl-tab title="Flow logs">
      <FlowLogsTab :region="vpc.region" :resource-id="vpc.VpcId" />
    </gl-tab>
  </gl-tabs>
</template>

<script lang="ts">
import {
  GlEmptyState,
  GlSkeletonLoading,
  GlTab,
  GlTable,
  GlTabs,
  GlCard,
  GlAlert,
  GlButton,
} from "@gitlab/ui";
import EC2Client from "aws-sdk/clients/ec2";
import { Component, Prop, Watch } from "vue-property-decorator";
import {
  FilterList,
  InternetGatewayList,
  NatGatewayList,
} from "aws-sdk/clients/ec2";
import { vpcs } from "@/components/network/VPC/vpc";
import VpcWithRegion = vpcs.VpcWithRegion;
import { Formatters } from "@/mixins/formatters";
import TagsTable from "@/components/common/TagsTable.vue";
import { mixins } from "vue-class-component";
import Notifications from "@/mixins/notifications";
import FlowLogsTab from "@/components/network/flowLogs/FlowLogsTab.vue";
import SubnetTab from "@/components/network/subnets/SubnetTab.vue";
import RelatedInstances from "@/components/EC2/instances/RelatedInstances.vue";
import RelatedRoutesTable from "@/components/network/routeTables/RelatedRoutesTable.vue";
import { CardContent } from "@/components/common/cardContent";
import DrawerCards from "@/components/common/DrawerCards.vue";
import RelatedSecurityGroups from "@/components/network/securityGroups/RelatedSecurityGroups.vue";
import RelatedNetworkInterfaces from "@/components/network/networkInterfaces/RelatedNetworkInterfaces.vue";
import { extractNameFromEC2Tags } from "@/components/common/tags";
import DeleteButtonWithConfirmation from "@/components/common/DeleteButtonWithConfirmation.vue";

@Component({
  components: {
    RelatedNetworkInterfaces,
    RelatedSecurityGroups,
    RelatedRoutesTable,
    TagsTable,
    GlTabs,
    GlTab,
    GlTable,
    GlEmptyState,
    GlSkeletonLoading,
    GlCard,
    GlAlert,
    GlButton,
    FlowLogsTab,
    SubnetTab,
    RelatedInstances,
    DrawerCards,
    DeleteButtonWithConfirmation,
  },
})
export default class VPC extends mixins(Formatters, Notifications) {
  @Prop(Object) readonly vpc!: VpcWithRegion;

  get resourceName(): string | undefined {
    return extractNameFromEC2Tags(this.vpc.Tags);
  }

  get filterByVPC(): FilterList {
    return [{ Name: "vpc-id", Values: [this.vpc.VpcId || ""] }];
  }

  get EC2() {
    return new EC2Client({
      region: this.vpc.region,
      credentials: this.$store.getters["sts/credentials"],
    });
  }

  get cards(): CardContent[] {
    return [
      {
        title: "CIDR Block",
        value: this.vpc.CidrBlock,
        helpText: "The primary IPv4 CIDR block for the VPC.",
      },
      {
        title: "DHCP Options ID",
        value: this.vpc.DhcpOptionsId,
        helpText:
          "The ID of the set of DHCP options you've associated with the VPC (or default if the default options are associated with the VPC).",
      },
      {
        title: "Owner ID",
        value: this.vpc.OwnerId,
        helpText: "The ID of the AWS account that owns the VPC.",
      },
      {
        title: "Default?",
        value: this.vpc.IsDefault,
        helpText:
          "Indicates whether the VPC is the default VPC for the region.",
      },
      {
        title: "Instance Tenancy",
        value: this.vpc.InstanceTenancy,
        helpText: "The allowed tenancy of instances launched into the VPC.",
      },
      { title: "Region", value: this.vpc.region, isRegion: true },
    ];
  }

  //Internet gateways tab
  igws: InternetGatewayList | undefined = [];
  igwsState: "loading" | "loaded" | "empty" | "error" = "loading";
  igwsError: string | undefined;
  igwsFields = [
    { key: "InternetGatewayId", sortable: true },
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: extractNameFromEC2Tags,
    },
    "OwnerId",
  ];

  describeIgws() {
    const params = {
      Filters: [{ Name: "attachment.vpc-id", Values: [this.vpc.VpcId || ""] }],
    };
    this.igwsState = "loading";
    this.igws = [];
    this.igwsError = "";

    this.EC2.describeInternetGateways(params, (err, data) => {
      if (err) {
        this.igwsError = err.message;
        this.igwsState = "error";
      } else {
        this.igws = data.InternetGateways;
        this.igwsError = undefined;
        this.igwsState =
          this.igws === undefined || this.igws.length === 0
            ? "empty"
            : "loaded";
      }
    });
  }

  //Nat gateways tab
  nats: NatGatewayList | undefined = [];
  natsState: "loading" | "loaded" | "empty" | "error" = "loading";
  natsError: string | undefined;
  natsFields = [
    { key: "NatGatewayId", sortable: true },
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: extractNameFromEC2Tags,
    },
    "SubnetId",
    {
      key: "CreateTime",
      formatter: this.standardDate,
    },
    "State",
  ];

  describeNats() {
    const params = { Filter: this.filterByVPC };
    this.natsError = "";
    this.nats = [];
    this.natsState = "loading";
    this.EC2.describeNatGateways(params, (err, data) => {
      if (err) {
        this.natsError = err.message;
        this.natsState = "error";
      } else {
        this.nats = data.NatGateways;
        this.natsError = undefined;
        this.natsState =
          this.nats === undefined || this.nats.length === 0
            ? "empty"
            : "loaded";
      }
    });
  }

  get alertVariant() {
    switch (this.vpc.State) {
      case "available":
        return "success";
      case "pending":
        return "info";
    }

    return "info";
  }

  deleteVpc() {
    if (!this.vpc.VpcId) {
      return;
    }

    this.EC2.deleteVpc({ VpcId: this.vpc.VpcId }, (err) => {
      if (err) {
        this.showError(err.message, "deleteVpc");
      } else {
        this.hideErrors("deleteVpc");
        this.showAlert({
          variant: "info",
          text: "Deleted VPC with ID " + this.vpc.VpcId,
          key: "deletingVpc",
          resourceId: this.vpc.VpcId,
        });
        this.$emit("deleted");
      }
    });
  }

  //This happens while the user clicks on a row of the table while the sidebar is open.
  @Watch("vpc")
  onVpcChanged() {
    this.describeIgws();
    this.describeNats();
  }
}
</script>
