<template>
  <gl-tabs theme="blue" lazy>
    <gl-tab title="Overview">
      <gl-modal
        modal-id="delete-vpc-modal"
        title="Delete VPC"
        no-fade
        :action-primary="deleteVpcButtonProps"
        :action-cancel="cancelProps"
        @primary="deleteVpc"
      >
        Are you sure that you want to delete this VPC?
      </gl-modal>
      <div class="row justify-content-between">
        <gl-alert :variant="alertVariant" :dismissible="false" class="col-9">
          <b>{{ vpc.State }}</b>
        </gl-alert>
        <gl-button
          style="height: 100%;"
          class="mt-2 col-2"
          variant="danger"
          category="secondary"
          :disabled="vpc.State !== 'available'"
          v-gl-modal-directive="'delete-vpc-modal'"
          >Delete this VPC</gl-button
        >
      </div>

      <div class="row justify-content-around mt-2">
        <gl-card class="col-3" title="CIDR Block">
          {{ vpc.CidrBlock }}
        </gl-card>

        <gl-card class="col-3" title="DHCP Options ID">
          {{ vpc.DhcpOptionsId }}
        </gl-card>
        <gl-card class="col-3" title="Owner ID">
          {{ vpc.OwnerId }}
        </gl-card>
      </div>
      <div class="row justify-content-around mt-3">
        <gl-card class="col-3" title="Default?">
          {{ vpc.IsDefault }}
        </gl-card>
        <gl-card class="col-3" title="Instance Tenancy">
          {{ vpc.InstanceTenancy }}
        </gl-card>
      </div>

      <h5 class="mt-3" v-if="vpc.CidrBlockAssociationSet.length > 0">
        CIDR Block Associations
      </h5>
      <gl-table :items="vpc.CidrBlockAssociationSet">
        <template v-slot:cell(CidrBlockState)="data">
          {{ data.value.State }}
        </template>
      </gl-table>

      <h5>Tags</h5>
      <!--I use key to force a rerender, I should study Vue reactivity better ¯\_(ツ)_/¯ -->
      <TagsTable
        :key="vpc.VpcId"
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
        filter-key="vpc"
        :filter-value="vpc.VpcId"
      />
    </gl-tab>

    <gl-tab title="EC2 Instances">
      <gl-alert variant="tip" :dismissible="false">
        A list of EC2 instances that have been deployed on this VPC.
      </gl-alert>

      <RelatedInstances
        :region="vpc.region"
        filter-key="vpc-id"
        :filter-value="vpc.VpcId"
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
  GlModal,
  GlModalDirective,
} from "@gitlab/ui";
import EC2Client from "aws-sdk/clients/ec2";
import { Component, Prop, Watch } from "vue-property-decorator";
import {
  FilterList,
  InternetGatewayList,
  RouteTableList,
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

@Component({
  components: {
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
    GlModal,
    FlowLogsTab,
    SubnetTab,
    RelatedInstances,
  },
  directives: { "gl-modal-directive": GlModalDirective },
})
export default class VPC extends mixins(Formatters, Notifications) {
  @Prop(Object) readonly vpc!: VpcWithRegion;

  deleteVpcButtonProps = {
    text: "Delete VPC",
  };

  cancelProps = {
    text: "Cancel",
  };

  get filterByVPC(): FilterList {
    return [{ Name: "vpc-id", Values: [this.vpc.VpcId || ""] }];
  }

  get EC2() {
    return new EC2Client({
      region: this.vpc.region,
      credentials: this.$store.getters["sts/credentials"],
    });
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
      formatter: this.extractNameFromTags,
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
      formatter: this.extractNameFromTags,
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

<style scoped></style>
