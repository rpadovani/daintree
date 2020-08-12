<template>
  <div>
    <gl-drawer
      :open="drawerOpened && selectedResourceKey !== ''"
      @close="close"
      style="min-width: 80%;"
    >
      <template #header>{{ selectedResourceTitle }}</template>

      <Igw :igw="selectedResource" v-on:deleted="close" />
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
          to="/network/igws/new"
          >Create new
        </gl-button>
      </div>
      <gl-table
        :items="resourcesAsList"
        :fields="fields"
        :filter="filter"
        :busy="isLoading"
        ref="resourcesTable"
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
            description="Remove the filter above to see all your resource"
            compact
          />
        </template>
        <template v-slot:cell(state)="data">
          <StateText
            v-if="data.item.Attachments && data.item.Attachments.length > 0"
            state="attached"
          />
          <StateText v-else state="detached" />
        </template>
        <template v-slot:cell(region)="data">
          <RegionText :region="data.value" />
        </template>
        <template v-slot:cell(VpcId)="data">
          <router-link
            v-if="data.item.Attachments && data.item.Attachments.length > 0"
            :to="`/network/vpcs?vpcId=${data.item.Attachments[0].VpcId}`"
          >
            {{ data.item.Attachments[0].VpcId }}
          </router-link>
          <span v-else>N/A</span>
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
          title="No Internet Gateways found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <gl-button icon="plus" variant="success" to="/network/igws/new"
              >Create new Igw Gateway
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
import { InternetGateway } from "aws-sdk/clients/ec2";

import Igw from "./Igw.vue";
import RegionText from "@/components/common/RegionText.vue";
import {
  GlDrawer,
  GlEmptyState,
  GlFormInput,
  GlModalDirective,
  GlButton,
  GlSkeletonLoading,
  GlTable,
} from "@gitlab/ui";
import { Component } from "vue-property-decorator";
import { DescribeInternetGatewaysRequest } from "aws-sdk/clients/ec2";
import StateText from "@/components/common/StateText.vue";
import { NetworkComponent } from "@/components/network/networkComponent";
import { extractNameFromEC2Tags } from "@/components/common/tags.ts";

@Component({
  components: {
    StateText,
    GlTable,
    RegionText,
    GlDrawer,
    GlButton,
    GlFormInput,
    Igw,
    GlSkeletonLoading,
    GlEmptyState,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
  },
})
export default class IgwList extends NetworkComponent<
  InternetGateway,
  "InternetGatewayId"
> {
  resourceName = "internet gateway";
  canCreate = true;
  resourceUniqueKey: "InternetGatewayId" = "InternetGatewayId";

  fields = [
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: extractNameFromEC2Tags,
    },
    { key: "InternetGatewayId", sortable: true },
    "State",
    { key: "region", sortable: true },
    "VpcId",
    { key: "OwnerId", sortable: true },
  ];

  async getResourcesForRegion(
    region: string,
    filterByIgwsId?: string[]
  ): Promise<InternetGateway[]> {
    const EC2 = await this.client(region);
    if (!EC2) {
      return [];
    }

    const params: DescribeInternetGatewaysRequest = {};
    if (filterByIgwsId) {
      params.Filters = [
        {
          Name: "internet-gateway-id",
          Values: filterByIgwsId,
        },
      ];
    }

    const data = await EC2.describeInternetGateways(params).promise();
    if (data.InternetGateways === undefined) {
      return [];
    }

    return data.InternetGateways;
  }
}
</script>
