<template>
  <div>
    <Header v-on:refresh="getAllResources" :loading="loadingCount > 0" />

    <gl-drawer
      :open="drawerOpened && selectedResourceKey !== ''"
      @close="close"
      style="min-width: 80%;"
    >
      <template #header>{{ selectedResourceTitle }}</template>

      <Peering :peering="selectedResource" v-on:deleted="close" />
    </gl-drawer>

    <div class="container-fluid">
      <div
        class="row justify-content-between mt-3 mb-2 ml-2 mr-2"
        v-if="resourcesAsList.length > 0"
      >
        <gl-form-input
          class="col-12 col-sm-8 col-lg-9 mb-3 mb-sm-0"
          id="filter"
          v-model="filter"
          placeholder="Type to filter..."
        />

        <gl-button
          icon="plus"
          category="secondary"
          variant="success"
          class="col-12 col-sm-3 col-lg-2"
          to="/network/peeringConnections/new"
          >New peering connection
        </gl-button>
      </div>
      <gl-table
        :items="resourcesAsList"
        :fields="fields"
        :filter="filter"
        :busy="loadingCount > 0"
        ref="resourcesTable"
        primary-key="VpcPeeringConnectionId"
        selectable
        select-mode="single"
        @row-selected="onRowSelected"
        v-show="resourcesAsList.length > 0"
        show-empty
        hover
      >
        <template v-slot:emptyfiltered="">
          <gl-empty-state
            class="mt-5"
            title="No resource matching your search!"
            svg-path="/assets/undraw_file_searching_duff.svg"
            description="Remove the filter above to see all your resources"
            compact
          />
        </template>
        <template v-slot:cell(requestervpc)="data">
          <gl-link
            :to="`/network/vpcs?vpcId=${data.item.RequesterVpcInfo.VpcId}`"
          >
            {{ data.item.RequesterVpcInfo.VpcId }}
          </gl-link>
        </template>
        <template v-slot:cell(acceptervpc)="data">
          <gl-link
            :to="`/network/vpcs?vpcId=${data.item.AccepterVpcInfo.VpcId}`"
          >
            {{ data.item.AccepterVpcInfo.VpcId }}
          </gl-link>
        </template>
        <template v-slot:cell(requestercidrs)="data">
          {{ data.item.RequesterVpcInfo.CidrBlock }}
        </template>
        <template v-slot:cell(acceptercidrs)="data">
          {{ data.item.AccepterVpcInfo.CidrBlock }}
        </template>
        <template v-slot:cell(status)="data">
          <StateText
            :state="data.value.Code"
            v-gl-tooltip.hover
            :title="data.value.Message"
          />
        </template>
        <template v-slot:cell(region)="data">
          <RegionText :region="data.value" />
        </template>
      </gl-table>

      <div class="container">
        <gl-skeleton-loading
          class="mt-5"
          v-if="loadingCount > 0 && resourcesAsList.length < 1"
        />

        <gl-empty-state
          class="mt-5"
          v-if="loadingCount === 0 && resourcesAsList.length === 0"
          title="No peering connections found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <gl-button
              icon="plus"
              variant="success"
              to="/network/peeringConnections/new"
              >New peering connection
            </gl-button>
            <gl-button
              category="secondary"
              variant="success"
              class="ml-2"
              v-gl-modal-directive="'region-modal-id'"
              >Change selected regions
            </gl-button>
          </template>
        </gl-empty-state>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {
  DescribeVpcPeeringConnectionsRequest,
  VpcPeeringConnection,
  VpcPeeringConnectionList,
} from "aws-sdk/clients/ec2";

import Header from "@/components/Header/Header.vue";
import RegionText from "@/components/common/RegionText.vue";
import {
  GlButton,
  GlDrawer,
  GlEmptyState,
  GlFormInput,
  GlIcon,
  GlModalDirective,
  GlSkeletonLoading,
  GlTable,
  GlLink,
  GlTooltipDirective,
} from "@gitlab/ui";
import Component from "vue-class-component";
import StateText from "@/components/common/StateText.vue";
import { NetworkComponent } from "@/components/network/networkComponent";
import Peering from "@/components/network/peering/Peering.vue";

@Component({
  components: {
    StateText,
    Header,
    GlTable,
    RegionText,
    GlIcon,
    GlDrawer,
    GlButton,
    GlFormInput,
    GlSkeletonLoading,
    GlEmptyState,
    GlLink,
    Peering,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
    "gl-tooltip": GlTooltipDirective,
  },
})
export default class PeeringList extends NetworkComponent<
  VpcPeeringConnection,
  "VpcPeeringConnectionId" | "Status"
> {
  resourceName = "peering";
  canCreate = true;
  resourceUniqueKey: "VpcPeeringConnectionId" = "VpcPeeringConnectionId";
  resourceStateKey: "Status" = "Status";
  workingStates = [
    "initiating-request",
    "pending-acceptance",
    "provisioning",
    "deleting",
  ];

  fields = [
    {
      key: "Tags",
      label: "Name",
      sortByFormatter: true,
      formatter: this.extractNameFromTags,
    },
    { key: "VpcPeeringConnectionId", label: "Peering Id", sortable: true },
    { key: "Status", label: "State" },
    {
      key: "RequesterVPC",
      label: "Requester VPC",
    },
    {
      key: "AccepterVPC",
      label: "Accepter VPC",
    },
    {
      key: "RequesterCIDRs",
      label: "Requester CIDRs",
    },
    {
      key: "AccepterCIDRs",
      label: "Accepter CIDRs",
    },
    { key: "region", sortable: true },
  ];

  async getResourcesForRegion(
    region: string,
    filterByPeeringsId?: string[]
  ): Promise<VpcPeeringConnectionList> {
    const EC2 = await this.client(region);
    if (!EC2) {
      return [];
    }

    const params: DescribeVpcPeeringConnectionsRequest = {};
    if (filterByPeeringsId) {
      params.Filters = [
        {
          Name: "vpc-peering-connection-id",
          Values: filterByPeeringsId,
        },
      ];
    }

    try {
      const data = await EC2.describeVpcPeeringConnections(params).promise();
      if (data.VpcPeeringConnections === undefined) {
        return [];
      }
      return data.VpcPeeringConnections;
    } catch (err) {
      this.showError(`[${region}] ` + err, `${region}#loadingPeering`);
      return [];
    }
  }

  getResourceState(resource: VpcPeeringConnection): string | null {
    return resource.Status?.Code || null;
  }

  destroyed(): void {
    this.$store.commit("notifications/dismissByKey", "loadingPeering");
  }
}
</script>

<style scoped></style>
