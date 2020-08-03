<template>
  <div>
    <gl-drawer
      :open="drawerOpened && selectedResourceKey !== ''"
      @close="close"
      style="min-width: 80%;"
    >
      <template #header>{{ selectedResourceTitle }}</template>

      <Instance :instance="selectedResource" />
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
          href="#/ec2/instances/new"
          v-if="false"
          >Launch a new instance</gl-button
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
          <StateText :state="data.value.Name" />
        </template>
        <template v-slot:cell(placement)="data">
          <RegionText :region="data.value" is-az />
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
    </div>

    <div class="container">
      <gl-skeleton-loading
        class="mt-5"
        v-if="isLoading && resourcesAsList.length < 1"
      />

      <gl-empty-state
        class="mt-5"
        v-else-if="!isLoading && resourcesAsList.length === 0"
        title="No instances found in the selected regions!"
        svg-path="/assets/undraw_empty_xct9.svg"
        :description="emptyStateDescription"
        compact
      >
        <template #actions>
          <gl-button
            v-if="false"
            icon="plus"
            variant="success"
            to="/network/instances/new"
            >Launch new instance
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
  DescribeInstancesRequest,
  Instance as EC2Instance,
  Placement,
} from "aws-sdk/clients/ec2";
import Instance from "./Instance.vue";
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
import { NetworkComponent } from "@/components/network/networkComponent";
import { extractNameFromEC2Tags } from "@/components/common/tags";

@Component({
  components: {
    GlTable,
    GlDrawer,
    GlFormInput,
    GlButton,
    Instance,
    StateText,
    RegionText,
    GlSkeletonLoading,
    GlEmptyState,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
  },
})
export default class Instances extends NetworkComponent<
  EC2Instance,
  "InstanceId" | "State"
> {
  resourceName = "instance";
  canCreate = true;
  resourceUniqueKey: "InstanceId" = "InstanceId";
  resourceStateKey: "State" = "State";
  workingStates = ["pending", "stopping", "shutting-down"];

  fields = [
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: extractNameFromEC2Tags,
    },
    {
      key: "InstanceId",
      sortable: true,
    },

    {
      key: "InstanceType",
      sortable: true,
    },
    {
      key: "KeyName",
      sortable: true,
      label: "SSH Key Name",
    },
    "State",
    {
      key: "Placement",
      formatter: (placement: Placement) => placement.AvailabilityZone,
    },
    { key: "VpcId", sortable: true },
    { key: "SubnetId", sortable: true },
  ];

  getResourceState(resource: EC2Instance): string | null {
    return resource.State?.Name || null;
  }

  async getResourcesForRegion(
    region: string,
    filterByInstanceIds?: string[]
  ): Promise<EC2Instance[]> {
    const EC2 = await this.client(region);
    if (!EC2) {
      return [];
    }

    const params: DescribeInstancesRequest = {};
    if (filterByInstanceIds) {
      params.Filters = [
        {
          Name: "instance-id",
          Values: filterByInstanceIds,
        },
      ];
    }

    const data = await EC2.describeInstances(params).promise();
    const instances: EC2Instance[] = [];

    data.Reservations?.forEach((r) => {
      r.Instances?.forEach((instance) => instances.push(instance));
    });

    return instances;
  }
}
</script>
