<template>
  <div>
    <gl-drawer
      :open="drawerOpened && selectedResourceKey !== ''"
      @close="close"
      style="min-width: 80%;"
    >
      <template #header>{{ selectedResourceTitle }}</template>

      <NetworkInterface
        :networkInterface="selectedResource"
        v-on:deleted="close"
      />
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
          to="/network/interfaces/new"
          >New network interface
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
        <template v-slot:cell(status)="data">
          <StateText :state="data.value" />
        </template>
        <template v-slot:cell(availabilityzone)="data">
          <RegionText :region="data.value" is-az />
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
          title="No network interfaces found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <gl-button
              icon="plus"
              variant="success"
              to="/network/interfaces/new"
              >New network interface
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
  NetworkInterface as AWSNetworkInterface,
  NetworkInterfaceList as AWSNetworkInterfaceList,
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
import NetworkInterface from "./NetworkInterface.vue";
import { DescribeNetworkInterfacesRequest } from "aws-sdk/clients/ec2";
import { extractNameFromEC2Tags } from "@/components/common/tags.ts";

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
    NetworkInterface,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
    "gl-tooltip": GlTooltipDirective,
  },
})
export default class NetworkInterfaceList extends NetworkComponent<
  AWSNetworkInterface,
  "NetworkInterfaceId" | "Status"
> {
  readonly resourceName = "network interface";
  readonly canCreate = true;
  readonly resourceUniqueKey: "NetworkInterfaceId" = "NetworkInterfaceId";
  readonly resourceStateKey: "Status" = "Status";
  readonly workingStates = ["attaching", "detaching"];

  readonly fields = [
    {
      key: "TagSet",
      label: "Name",
      sortByFormatter: true,
      formatter: extractNameFromEC2Tags,
    },
    {
      key: "NetworkInterfaceId",
      label: "Interface Id",
      sortable: true,
    },
    { key: "PrivateIpAddress", sortable: true },
    {
      key: "InterfaceType",
      sortable: true,
    },
    {
      key: "VpcId",
      sortable: true,
    },
    { key: "Status" },
    { key: "AvailabilityZone", sortable: true },
  ];

  async getResourcesForRegion(
    region: string,
    filterByNetworkInterfacesId?: string[]
  ): Promise<AWSNetworkInterfaceList> {
    const EC2 = await this.client(region);
    if (!EC2) {
      return [];
    }

    const params: DescribeNetworkInterfacesRequest = {};
    if (filterByNetworkInterfacesId) {
      params.Filters = [
        {
          Name: "network-interface-id",
          Values: filterByNetworkInterfacesId,
        },
      ];
    }

    const data = await EC2.describeNetworkInterfaces(params).promise();
    if (data.NetworkInterfaces === undefined) {
      return [];
    }
    return data.NetworkInterfaces;
  }
}
</script>
