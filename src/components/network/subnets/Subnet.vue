<template>
  <gl-tabs theme="blue" lazy>
    <gl-tab title="Overview">
      <div class="row justify-content-between">
        <gl-alert :variant="alertVariant" :dismissible="false" class="col-9">
          <b>{{ subnet.State }}</b>
        </gl-alert>

        <DeleteButtonWithConfirmation
          style="height: 100%"
          class="mt-2 col-2"
          resource-type="subnet"
          :resource-id="subnet.SubnetId"
          :resource-name="resourceName"
          @primary="deleteSubnet"
          :disabled="subnet.State !== 'available'"
        />
      </div>

      <DrawerCards :cards="cards" />

      <h5 class="mt-3">Tags</h5>
      <TagsTable
        :tags="subnet.Tags"
        :region="subnet.region"
        :resource-id="subnet.SubnetId"
      />
    </gl-tab>

    <gl-tab title="Route tables">
      <RelatedRoutesTable
        :region="subnet.region"
        filter-key="association.subnet-id"
        :filter-value="subnet.SubnetId"
      />
    </gl-tab>

    <gl-tab title="Network ACL" @click="describeAcls">
      <gl-alert
        v-if="aclsState === 'error'"
        variant="danger"
        :dismissible="false"
        >{{ aclsError }}
      </gl-alert>
      <gl-skeleton-loading v-if="aclsState === 'loading'" />

      <h4 v-if="aclsState === 'loaded'">Inbound rules</h4>
      <gl-table
        v-if="aclsState === 'loaded'"
        :items="inboundRules"
        :fields="inboundFields"
      />

      <h4 v-if="aclsState === 'loaded'">Outbound rules</h4>
      <gl-table
        v-if="aclsState === 'loaded'"
        :items="outboundRules"
        :fields="outboundFields"
      >
      </gl-table>

      <gl-empty-state
        v-if="aclsState === 'empty'"
        title="No related network ACL"
        svg-path="/assets/undraw_empty_xct9.svg"
        description="Daintree hasn't found any network ACL associated to this subnet!"
        compact
      />
    </gl-tab>

    <gl-tab title="EC2 Instances">
      <gl-alert variant="tip" :dismissible="false">
        A list of EC2 instances that have been deployed on this subnet.
      </gl-alert>

      <RelatedInstances
        :region="subnet.region"
        filter-key="subnet-id"
        :filter-value="subnet.SubnetId"
      />
    </gl-tab>

    <gl-tab title="Network interfaces">
      <gl-alert variant="tip" :dismissible="false">
        List of network interfaces belonging to this subnet.
      </gl-alert>

      <RelatedNetworkInterfaces
        :region="subnet.region"
        filter-name="subnet-id"
        :filter-values="[subnet.SubnetId]"
      />
    </gl-tab>

    <gl-tab title="Flow logs">
      <FlowLogsTab :region="subnet.region" :resource-id="subnet.SubnetId" />
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
import { NetworkAcl, NetworkAclEntry } from "aws-sdk/clients/ec2";
import { Formatters } from "@/mixins/formatters";
import TagsTable from "@/components/common/TagsTable.vue";
import { mixins } from "vue-class-component";
import Notifications from "@/mixins/notifications";
import { Subnets } from "@/components/network/subnets/subnet";
import SubnetWithRegion = Subnets.SubnetWithRegion;
import FlowLogsTab from "@/components/network/flowLogs/FlowLogsTab.vue";
import StateText from "@/components/common/StateText.vue";
import ListOfRoutes from "@/components/network/routeTables/ListOfRoutes.vue";
import RelatedInstances from "@/components/EC2/instances/RelatedInstances.vue";
import RelatedRoutesTable from "@/components/network/routeTables/RelatedRoutesTable.vue";
import { CardContent } from "@/components/common/cardContent";
import DrawerCards from "@/components/common/DrawerCards.vue";
import RelatedNetworkInterfaces from "@/components/network/networkInterfaces/RelatedNetworkInterfaces.vue";
import DeleteButtonWithConfirmation from "@/components/common/DeleteButtonWithConfirmation.vue";
import { extractNameFromEC2Tags } from "@/components/common/tags";

@Component({
  components: {
    RelatedRoutesTable,
    ListOfRoutes,
    FlowLogsTab,
    TagsTable,
    GlTabs,
    GlTab,
    GlTable,
    GlEmptyState,
    GlSkeletonLoading,
    GlCard,
    GlAlert,
    GlButton,
    StateText,
    RelatedInstances,
    DrawerCards,
    RelatedNetworkInterfaces,
    DeleteButtonWithConfirmation,
  },
})
export default class Subnet extends mixins(Formatters, Notifications) {
  @Prop(Object) readonly subnet!: SubnetWithRegion;

  get resourceName(): string | undefined {
    return extractNameFromEC2Tags(this.subnet.Tags);
  }

  get cards(): CardContent[] {
    return [
      {
        title: "CIDR Block",
        value: this.subnet.CidrBlock,
        helpText: "The IPv4 CIDR block assigned to the subnet.",
      },
      {
        title: "Availability zone",
        value: this.subnet.AvailabilityZone,
        isAz: true,
        helpText: "The Availability Zone of the subnet.",
      },
      {
        title: "VPC ID",
        value: this.subnet.VpcId,
        linkTo: `/network/vpcs?vpcId=${this.subnet.VpcId}`,
        helpText: "The ID of the VPC the subnet is in.",
      },
      {
        title: "Available IPs",
        value: this.subnet.AvailableIpAddressCount,
        helpText:
          "The number of unused private IPv4 addresses in the subnet. The IPv4 addresses for any stopped instances are considered unavailable.",
      },
      {
        title: "Map public IPv4?",
        value: this.subnet.MapPublicIpOnLaunch,
        helpText:
          "Indicates whether instances launched in this subnet receive a public IPv4 address.",
      },
      {
        title: "Assign IPv6?",
        value: this.subnet.AssignIpv6AddressOnCreation,
        helpText:
          "Indicates whether a network interface created in this subnet (including a network interface created by RunInstances) receives an IPv6 address.",
      },
      {
        title: "Default?",
        value: this.subnet.DefaultForAz,
        helpText:
          "Indicates whether this is the default subnet for the Availability Zone.",
      },
      {
        title: "Owner ID",
        value: this.subnet.OwnerId,
        helpText: "The ID of the AWS account that owns the subnet.",
      },
    ];
  }

  get EC2() {
    return new EC2Client({
      region: this.subnet.region,
      credentials: this.$store.getters["sts/credentials"],
    });
  }

  //Network ACL tab
  acls: NetworkAcl[] | undefined = [];
  aclsState: "loading" | "loaded" | "empty" | "error" = "loading";
  aclsError: string | undefined;
  inboundFields = [
    {
      key: "RuleNumber",
      label: "# Rule",
      sortable: true,
    },
    { key: "Protocol", label: "Protocol" },
    { key: "CidrBlock", label: "Source" },
    { key: "RuleAction", sortable: true },
  ];
  outboundFields = [
    {
      key: "RuleNumber",
      label: "# Rule",
      sortable: true,
    },
    { key: "Protocol", label: "Protocol" },
    { key: "CidrBlock", label: "Target" },
    { key: "RuleAction", sortable: true },
  ];

  describeAcls() {
    this.aclsError = "";
    this.acls = [];
    this.aclsState = "loading";
    this.EC2.describeNetworkAcls(
      {
        Filters: [
          {
            Name: "association.subnet-id",
            Values: [this.subnet.SubnetId || ""],
          },
        ],
      },
      (err, data) => {
        if (err) {
          this.aclsError = err.message;
          this.aclsState = "error";
        } else {
          this.acls = data.NetworkAcls;
          this.aclsError = undefined;
          this.aclsState =
            this.acls === undefined || this.acls.length === 0
              ? "empty"
              : "loaded";
        }
      }
    );
  }

  get inboundRules(): NetworkAclEntry[] {
    if (this.acls && this.acls.length > 0) {
      return this.acls[0].Entries?.filter((e) => e.Egress === false) || [];
    }
    return [];
  }

  get outboundRules(): NetworkAclEntry[] {
    if (this.acls && this.acls.length > 0) {
      return this.acls[0].Entries?.filter((e) => e.Egress === true) || [];
    }
    return [];
  }

  get alertVariant() {
    switch (this.subnet.State) {
      case "available":
        return "success";
      case "pending":
        return "info";
    }

    return "info";
  }

  deleteSubnet() {
    if (!this.subnet.SubnetId) {
      return;
    }

    this.EC2.deleteSubnet({ SubnetId: this.subnet.SubnetId }, (err) => {
      if (err) {
        this.showError(err.message, "deleteSubnet");
      } else {
        this.hideErrors("deleteNat");
        this.showAlert({
          variant: "info",
          text: "Deleted subnet with ID " + this.subnet.SubnetId,
          key: "deletingSubnet",
          resourceId: this.subnet.SubnetId,
        });
        this.$emit("deleted");
      }
    });
  }

  //This happens while the user clicks on a row of the table while the sidebar is open.
  @Watch("subnet")
  onSubnetChanged() {
    this.describeAcls();
  }
}
</script>
