<template>
  <div>
    <gl-drawer
      :open="drawerOpened && selectedResourceKey !== {}"
      @close="close"
      style="min-width: 80%"
    >
      <template #header>{{ selectedResourceTitle }}</template>

      <Eip :eip="selectedResource" v-on:deleted="close" />
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
          to="/network/eips/new"
          >Allocate new
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

        <template v-slot:cell(networkinterfaceid)="data">
          <gl-link :to="`/network/interfaces?NetworkInterfaceId=${data.value}`">
            {{ data.value }}
          </gl-link>
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
          v-else-if="!isLoading && resourcesAsList.length === 0"
          title="No Elastic IP found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <gl-button icon="plus" variant="success" to="/network/eips/new"
              >Allocate new Elastic IP
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
import { Address, DescribeAddressesRequest } from "aws-sdk/clients/ec2";
import Eip from "./Eip.vue";
import RegionText from "@/components/common/RegionText.vue";
import {
  GlButton,
  GlDrawer,
  GlEmptyState,
  GlFormInput,
  GlModalDirective,
  GlSkeletonLoading,
  GlTable,
  GlLink,
} from "@gitlab/ui";
import { Component } from "vue-property-decorator";
import StateText from "@/components/common/StateText.vue";
import { NetworkComponent } from "@/components/network/networkComponent";
import { extractNameFromEC2Tags } from "@/components/common/tags";

@Component({
  components: {
    StateText,
    GlTable,
    RegionText,
    GlDrawer,
    GlButton,
    GlFormInput,
    Eip,
    GlSkeletonLoading,
    GlEmptyState,
    GlLink,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
  },
})
export default class EipList extends NetworkComponent<Address, "AllocationId"> {
  resourceName = "elastic IP";
  canCreate = true;
  resourceUniqueKey: "AllocationId" = "AllocationId";

  fields = [
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: extractNameFromEC2Tags,
    },
    { key: "AllocationId", sortable: true },
    { key: "PublicIp", sortable: true },
    { key: "PrivateIpAddress", sortable: true },
    { key: "region", sortable: true },
    { key: "NetworkInterfaceId", sortable: true },
    { key: "InstanceId", sortable: true },
    { key: "AssociationId", sortable: true },
  ];

  async getResourcesForRegion(
    region: string,
    filterByEipsId?: string[]
  ): Promise<Address[]> {
    const EC2 = await this.client(region);
    if (!EC2) {
      return [];
    }

    const params: DescribeAddressesRequest = {};
    if (filterByEipsId) {
      params.Filters = [
        {
          Name: "allocation-id",
          Values: filterByEipsId,
        },
      ];
    }

    const data = await EC2.describeAddresses(params).promise();
    if (data.Addresses === undefined) {
      return [];
    }

    return data.Addresses;
  }
}
</script>
