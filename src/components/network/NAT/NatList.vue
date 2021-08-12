<template>
  <div>
    <gl-drawer
      :open="drawerOpened && selectedResourceKey !== ''"
      @close="close"
      style="min-width: 80%"
    >
      <template #header>{{ selectedResourceTitle }}</template>

      <Nat :nat="selectedResource" v-on:deleted="close" />
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
          to="/network/nats/new"
          >Create new
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
        <template v-slot:cell(state)="data">
          <StateText :state="data.value" />
        </template>
        <template v-slot:cell(region)="data">
          <RegionText :region="data.value" />
        </template>
        <template v-slot:cell(publicIp)="data">
          {{
            data.item.NatGatewayAddresses.map((el) => el.PublicIp).join(", ")
          }}
        </template>
        <template v-slot:cell(privateIp)="data">
          {{
            data.item.NatGatewayAddresses.map((el) => el.PrivateIp).join(", ")
          }}
        </template>
        <template v-slot:cell(VpcId)="data">
          <router-link :to="`/network/vpcs?vpcId=${data.value}`">
            {{ data.value }}
          </router-link>
        </template>
        <template v-slot:cell(SubnetId)="data">
          <router-link :to="`/network/subnets?subnetId=${data.value}`">
            {{ data.value }}
          </router-link>
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
          title="No Nat Gateways found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <gl-button icon="plus" variant="success" to="/network/nats/new"
              >Create new Nat Gateway
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
import { DescribeNatGatewaysRequest, NatGateway } from "aws-sdk/clients/ec2";

import Nat from "./Nat.vue";
import RegionText from "@/components/common/RegionText.vue";
import {
  GlButton,
  GlDrawer,
  GlEmptyState,
  GlFormInput,
  GlModalDirective,
  GlSkeletonLoading,
  GlTable,
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
    Nat,
    GlSkeletonLoading,
    GlEmptyState,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
  },
})
export default class NatList extends NetworkComponent<
  NatGateway,
  "NatGatewayId" | "State"
> {
  resourceName = "nat gateway";
  canCreate = true;
  resourceUniqueKey: "NatGatewayId" = "NatGatewayId";
  resourceStateKey: "State" = "State";
  workingStates = ["pending", "deleting"];

  fields = [
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: extractNameFromEC2Tags,
    },
    { key: "NatGatewayId", sortable: true },
    "State",
    { key: "publicIp", sortable: true },
    { key: "privateIp", sortable: true },
    { key: "region", sortable: true },
    { key: "VpcId", sortable: true },
    { key: "SubnetId", sortable: true },
  ];

  async getResourcesForRegion(
    region: string,
    filterByNatsId?: string[]
  ): Promise<NatGateway[]> {
    const EC2 = await this.client(region);
    if (!EC2) {
      return [];
    }

    const params: DescribeNatGatewaysRequest = {};
    if (filterByNatsId) {
      params.Filter = [
        {
          Name: "nat-gateway-id",
          Values: filterByNatsId,
        },
      ];
    }

    const data = await EC2.describeNatGateways(params).promise();
    if (data.NatGateways === undefined) {
      return [];
    }

    return data.NatGateways;
  }
}
</script>
