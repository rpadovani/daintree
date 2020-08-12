<template>
  <div>
    <gl-drawer
      :open="drawerOpened && selectedResourceKey !== ''"
      @close="close"
      style="min-width: 80%;"
    >
      <template #header>{{ selectedResourceTitle }}</template>

      <DhcpOptions :dhcpOptions="selectedResource" v-on:deleted="close" />
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
          to="/network/dhcp/new"
          >New DHCP options set
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
  DhcpOptions as AWSDhcpOptions,
  DhcpOptionsList as AWSDhcpOptionsList,
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
import DhcpOptions from "./DhcpOptions.vue";
import { DescribeDhcpOptionsRequest } from "aws-sdk/clients/ec2";
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
    DhcpOptions,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
    "gl-tooltip": GlTooltipDirective,
  },
})
export default class DhcpOptionsList extends NetworkComponent<
  AWSDhcpOptions,
  "DhcpOptionsId"
> {
  readonly resourceName = "DHCP options sets";
  readonly canCreate = true;
  readonly resourceUniqueKey: "DhcpOptionsId" = "DhcpOptionsId";

  readonly fields = [
    {
      key: "Tags",
      label: "Name",
      sortByFormatter: true,
      formatter: extractNameFromEC2Tags,
    },
    {
      key: "DhcpOptionsId",
      label: "DHCP Options ID",
      sortable: true,
    },
    {
      key: "OwnerId",
      sortable: true,
    },
    { key: "region", sortable: true },
  ];

  async getResourcesForRegion(
    region: string,
    filterByDhcpOptionssId?: string[]
  ): Promise<AWSDhcpOptionsList> {
    const EC2 = await this.client(region);
    if (!EC2) {
      return [];
    }

    const params: DescribeDhcpOptionsRequest = {};
    if (filterByDhcpOptionssId) {
      params.Filters = [
        {
          Name: "dhcp-options-id",
          Values: filterByDhcpOptionssId,
        },
      ];
    }

    const data = await EC2.describeDhcpOptions(params).promise();
    if (data.DhcpOptions === undefined) {
      return [];
    }
    return data.DhcpOptions;
  }
}
</script>
