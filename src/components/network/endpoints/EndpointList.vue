<template>
  <div>
    <gl-drawer
      :open="drawerOpened && selectedResourceKey !== ''"
      @close="close"
      style="min-width: 80%"
    >
      <template #header>{{ selectedResourceTitle }}</template>

      <Endpoint :endpoint="selectedResource" v-on:deleted="close" />
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
          to="/network/endpoints/new"
          >New endpoint
        </gl-button>
      </div>
      <gl-table
        :items="resourcesAsList"
        :fields="fields"
        :filter="filter"
        :busy="isLoading"
        ref="resourcesTable"
        :primary-key="resourceUniqueKey"
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
        <template v-slot:cell(vpcid)="data">
          <gl-link :to="`/network/vpcs?vpcId=${data.value}`">
            {{ data.value }}
          </gl-link>
        </template>
        <template v-slot:cell(state)="data">
          <StateText :state="data.value" />
        </template>
        <template v-slot:cell(region)="data">
          <RegionText :region="data.value" />
        </template>
      </gl-table>

      <div class="container">
        <gl-skeleton-loading
          class="mt-5"
          v-if="isLoading && resourcesAsList.length < 1"
        />

        <gl-empty-state
          class="mt-5"
          v-if="!isLoading && resourcesAsList.length === 0"
          title="No endpoints found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <gl-button icon="plus" variant="success" to="/network/endpoints/new"
              >New endpoint
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
  DescribeVpcEndpointsRequest,
  VpcEndpoint,
  VpcEndpointSet,
} from "aws-sdk/clients/ec2";

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
import Endpoint from "./Endpoint.vue";
import { extractNameFromEC2Tags } from "@/components/common/tags";

@Component({
  components: {
    StateText,
    GlTable,
    RegionText,
    GlIcon,
    GlDrawer,
    GlButton,
    GlFormInput,
    GlSkeletonLoading,
    GlEmptyState,
    GlLink,
    Endpoint,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
    "gl-tooltip": GlTooltipDirective,
  },
})
export default class EndpointList extends NetworkComponent<
  VpcEndpoint,
  "VpcEndpointId" | "State"
> {
  resourceName = "endpoint";
  canCreate = true;
  resourceUniqueKey: "VpcEndpointId" = "VpcEndpointId";
  resourceStateKey: "State" = "State";
  workingStates = ["Pending", "PendingAcceptance", "Deleting"];

  fields = [
    {
      key: "Tags",
      label: "Name",
      sortByFormatter: true,
      formatter: extractNameFromEC2Tags,
    },
    { key: "VpcEndpointId", label: "Endpoint Id", sortable: true },
    { key: "VpcEndpointType", label: "Type", sortable: true },
    {
      key: "ServiceName",
      sortable: true,
    },
    {
      key: "VpcId",
      sortable: true,
    },
    { key: "State" },
    { key: "region", sortable: true },
  ];

  async getResourcesForRegion(
    region: string,
    filterByEndpointsId?: string[]
  ): Promise<VpcEndpointSet> {
    const EC2 = await this.client(region);
    if (!EC2) {
      return [];
    }

    const params: DescribeVpcEndpointsRequest = {};
    if (filterByEndpointsId) {
      params.Filters = [
        {
          Name: "vpc-endpoint-id",
          Values: filterByEndpointsId,
        },
      ];
    }

    const data = await EC2.describeVpcEndpoints(params).promise();
    if (data.VpcEndpoints === undefined) {
      return [];
    }
    return data.VpcEndpoints;
  }
}
</script>
