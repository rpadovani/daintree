<template>
  <div>
    <gl-drawer
      :open="drawerOpened && selectedResourceKey !== ''"
      @close="close"
      style="min-width: 80%"
    >
      <template #header>{{ selectedResourceTitle }}</template>

      <LoadBalancer :loadBalancer="selectedResource" v-on:deleted="close" />
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
          href="#/eLBv2/loadBalancers/new"
          v-if="false"
          >Create a new load balancer</gl-button
        >
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

        <template v-slot:cell(VpcId)="data">
          <router-link :to="`/network/vpcs?vpcId=${data.value}`">
            {{ data.value }}
          </router-link>
        </template>
      </gl-table>
    </div>

    <div class="container">
      <gl-skeleton-loading
        class="mt-5"
        v-if="isLoading && resourcesAsList.length < 1"
      />

      <gl-empty-state
        class="mt-5"
        v-else-if="!isLoading && resourcesAsList.length === 0"
        title="No load balancers found in the selected regions!"
        svg-path="/assets/undraw_empty_xct9.svg"
        :description="emptyStateDescription"
        compact
      >
        <template #actions>
          <gl-button
            v-if="false"
            icon="plus"
            variant="success"
            to="/network/loadBalancers/new"
            >Launch new loadBalancer
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
</template>

<script lang="ts">
import {
  DescribeLoadBalancersInput,
  LoadBalancer as AWSLoadBalancer,
  LoadBalancerState,
} from "aws-sdk/clients/elbv2";
import LoadBalancer from "./LoadBalancer.vue";
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
import RegionText from "@/components/common/RegionText.vue";
import { ElbListComponent } from "@/components/EC2/elbListComponent";

@Component({
  components: {
    GlTable,
    GlDrawer,
    GlFormInput,
    GlButton,
    LoadBalancer,
    StateText,
    RegionText,
    GlSkeletonLoading,
    GlEmptyState,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
  },
})
export default class LoadBalancers extends ElbListComponent<
  AWSLoadBalancer,
  "LoadBalancerArn" | "State"
> {
  readonly resourceName = "load balancer";
  readonly canCreate = false;
  readonly resourceUniqueKey: "LoadBalancerArn" = "LoadBalancerArn";
  readonly resourceStateKey: "State" = "State";
  readonly workingStates = ["provisioning"];

  readonly fields = [
    {
      key: "LoadBalancerName",
      label: "Name",
      sortable: true,
    },
    {
      key: "Type",
      sortable: true,
    },
    {
      key: "Scheme",
      sortable: true,
    },
    { key: "State", formatter: (state: LoadBalancerState) => state.Code },
    {
      key: "region",
      sortable: true,
    },
    { key: "VpcId", sortable: true },
    { key: "CreatedTime", sortable: true, formatter: this.standardDate },
  ];

  getResourceState(lb: AWSLoadBalancer): string | null {
    if (lb.State) {
      return lb.State.Code || null;
    }

    return null;
  }

  get selectedResourceTitle(): string | undefined {
    const name = this.selectedResource?.LoadBalancerName;

    if (name) {
      return `${name} (${this.selectedResource?.LoadBalancerArn})`;
    }
    return this.selectedResource?.LoadBalancerArn;
  }

  async getResourcesForRegion(
    region: string,
    filterByLoadBalancerArns?: string[]
  ): Promise<AWSLoadBalancer[]> {
    const ELBv2 = await this.client(region);
    if (!ELBv2) {
      return [];
    }

    const params: DescribeLoadBalancersInput = {};
    if (filterByLoadBalancerArns) {
      params.LoadBalancerArns = filterByLoadBalancerArns;
    }

    const data = await ELBv2.describeLoadBalancers(params).promise();
    if (data.LoadBalancers === undefined) {
      return [];
    }

    return data.LoadBalancers;
  }
}
</script>
