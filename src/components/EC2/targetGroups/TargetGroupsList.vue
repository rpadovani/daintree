<template>
  <div>
    <gl-drawer
      :open="drawerOpened && selectedResourceKey !== ''"
      @close="close"
      style="min-width: 80%;"
    >
      <template #header>{{ selectedResourceTitle }}</template>

      <TargetGroup :targetGroup="selectedResource" v-on:deleted="close" />
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
          href="#/eLBv2/targetGroups/new"
          v-if="false"
          >Create a new target group</gl-button
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

        <template v-slot:cell(region)="data">
          <RegionText :region="data.value" />
        </template>

        <template v-slot:cell(VpcId)="data">
          <router-link :to="`/network/vpcs?vpcId=${data.value}`">
            {{ data.value }}
          </router-link>
        </template>

        <template v-slot:cell(LoadBalancerArns)="data">
          <router-link
            :to="`/ec2/loadBalancers?loadBalancerArn=${lb}`"
            v-for="lb in data.value"
            :key="lb"
          >
            {{ extractLBName(lb) }}
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
            to="/network/targetGroups/new"
            >Launch new targetGroup
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
  DescribeTargetGroupsInput,
  TargetGroup as AWSTargetGroup,
} from "aws-sdk/clients/elbv2";
import TargetGroup from "./TargetGroup.vue";
import {
  GlTable,
  GlDrawer,
  GlFormInput,
  GlButton,
  GlSkeletonLoading,
  GlEmptyState,
  GlModalDirective,
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
    TargetGroup,
    StateText,
    RegionText,
    GlSkeletonLoading,
    GlEmptyState,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
  },
})
export default class TargetGroups extends ElbListComponent<
  AWSTargetGroup,
  "TargetGroupArn"
> {
  readonly resourceName = "target group";
  readonly canCreate = false;
  readonly resourceUniqueKey: "TargetGroupArn" = "TargetGroupArn";

  readonly fields = [
    {
      key: "TargetGroupName",
      label: "Name",
      sortable: true,
    },
    {
      key: "Port",
      sortable: true,
    },
    {
      key: "Protocol",
      sortable: true,
    },
    { key: "TargetType", label: "Target type", sortable: true },
    {
      key: "region",
      sortable: true,
    },
    { key: "VpcId", sortable: true },
    { key: "LoadBalancerArns", label: "Load balancer", sortable: false },
  ];

  get selectedResourceTitle(): string | undefined {
    const name = this.selectedResource?.TargetGroupName;

    if (name) {
      return `${name} (${this.selectedResource?.TargetGroupArn})`;
    }
    return this.selectedResource?.TargetGroupArn;
  }

  extractLBName(lbArn: string): string {
    const splitted = lbArn.split("/");
    return splitted[splitted.length - 2];
  }

  async getResourcesForRegion(
    region: string,
    filterByTargetGroupArns?: string[]
  ): Promise<AWSTargetGroup[]> {
    const ELBv2 = await this.client(region);
    if (!ELBv2) {
      return [];
    }

    const params: DescribeTargetGroupsInput = {};
    if (filterByTargetGroupArns) {
      params.TargetGroupArns = filterByTargetGroupArns;
    }

    const data = await ELBv2.describeTargetGroups(params).promise();
    if (data.TargetGroups === undefined) {
      return [];
    }

    return data.TargetGroups;
  }
}
</script>
