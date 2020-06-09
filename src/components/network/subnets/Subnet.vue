<template>
  <gl-tabs theme="blue" lazy>
    <gl-tab title="Overview">
      <gl-modal
        modal-id="delete-subnet-modal"
        title="Delete subnet"
        no-fade
        :action-primary="deleteSubnetButtonProps"
        :action-cancel="cancelProps"
        @primary="deleteSubnet"
      >
        Are you sure that you want to delete this subnet?
      </gl-modal>
      <div class="row justify-content-between">
        <gl-alert :variant="alertVariant" :dismissible="false" class="col-9">
          <b>{{ subnet.State }}</b>
        </gl-alert>
        <gl-button
          style="height: 100%;"
          class="mt-2 col-2"
          variant="danger"
          category="secondary"
          :disabled="subnet.State !== 'available'"
          v-gl-modal-directive="'delete-subnet-modal'"
          >Delete this subnet</gl-button
        >
      </div>

      <div class="row justify-content-around mt-2">
        <gl-card class="col-3" title="CIDR Block">
          {{ subnet.CidrBlock }}
        </gl-card>

        <gl-card class="col-3" title="Availability zone">
          {{ subnet.AvailabilityZone }}
        </gl-card>
        <gl-card class="col-3" title="VPC ID">
          <router-link :to="`/network/vpcs?vpcId=${subnet.VpcId}`">
            {{ subnet.VpcId }}
          </router-link>
        </gl-card>
      </div>
      <div class="row justify-content-around mt-3">
        <gl-card class="col-3" title="Available IPs">
          {{ subnet.AvailableIpAddressCount }}
        </gl-card>
        <gl-card class="col-3" title="Map public IPv4?">
          {{ subnet.MapPublicIpOnLaunch }}
        </gl-card>
        <gl-card class="col-3" title="Assign IPv6?">
          {{ subnet.AssignIpv6AddressOnCreation }}
        </gl-card>
      </div>
      <div class="row justify-content-around mt-3">
        <gl-card class="col-3" title="Default?">
          {{ subnet.DefaultForAz }}
        </gl-card>
        <gl-card class="col-3" title="Owner ID">
          {{ subnet.OwnerId }}
        </gl-card>
      </div>

      <h5 class="mt-3">Tags</h5>
      <!--I use key to force a rerender, I should study Vue reactivity better ¯\_(ツ)_/¯ -->
      <TagsTable
        :key="subnet.SubnetId"
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
  GlModal,
  GlModalDirective,
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
    GlModal,
    StateText,
    RelatedInstances,
  },
  directives: { "gl-modal-directive": GlModalDirective },
})
export default class Subnet extends mixins(Formatters, Notifications) {
  @Prop(Object) readonly subnet!: SubnetWithRegion;

  deleteSubnetButtonProps = {
    text: "Delete subnet",
  };

  cancelProps = {
    text: "Cancel",
  };

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

<style scoped></style>
