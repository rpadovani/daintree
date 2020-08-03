<template>
  <div>
    <gl-drawer
      :open="drawerOpened && selectedResourceKey !== ''"
      @close="close"
      style="min-width: 80%;"
    >
      <template #header>{{ selectedResourceTitle }}</template>

      <Volume :volume="selectedResource" v-on:deleted="close" />
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
          to="/ec2/volumes/new"
          >Create new volume
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
        @row-selected="(row) => onRowSelected(row)"
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
        <template v-slot:cell(AvailabilityZone)="data">
          <RegionText :region="data.value" is-az />
        </template>
        <template v-slot:cell(Attachments)="data">
          <gl-link
            v-for="att in data.value"
            :key="att.VolumeId"
            :to="`/ec2/instances?instanceId=${att.InstanceId}`"
          >
            {{ att.InstanceId }}
          </gl-link>
        </template>
        <template v-slot:cell(state)="data">
          <StateText :state="data.value" />
        </template>

        <template v-slot:cell(encrypted)="data">
          <gl-icon
            v-if="data.value"
            name="check-circle"
            v-gl-tooltip.hover
            title="Encrypted"
          />
          <gl-icon
            v-else
            name="status_failed"
            v-gl-tooltip.hover
            title="Not encrypted"
          />
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
          title="No volume found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <gl-button icon="plus" variant="success" to="/ec2/volumes/new"
              >Create new volume
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
  DescribeVolumesRequest,
  Volume as AWSVolume,
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
import { NetworkComponent } from "@/components/network/networkComponent";
import Volume from "@/components/EC2/volumes/Volume.vue";
import StateText from "@/components/common/StateText.vue";
import { extractNameFromEC2Tags } from "@/components/common/tags";

@Component({
  components: {
    Volume,
    GlTable,
    RegionText,
    GlIcon,
    GlDrawer,
    GlButton,
    GlFormInput,
    GlSkeletonLoading,
    GlEmptyState,
    GlLink,
    StateText,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
    "gl-tooltip": GlTooltipDirective,
  },
})
export default class VolumesList extends NetworkComponent<
  AWSVolume,
  "VolumeId" | "State"
> {
  resourceName = "volume";
  canCreate = true;
  resourceUniqueKey: "VolumeId" = "VolumeId";
  resourceStateKey: "State" = "State";
  workingStates = ["creating", "deleting"];

  fields = [
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: extractNameFromEC2Tags,
    },
    { key: "VolumeId", sortable: true },
    "Attachments",
    "State",
    { key: "Encrypted", label: "Encrypted", class: "text-center" },
    {
      key: "Size",
      sortable: true,
      formatter: (value: string): string => `${value} GiB`,
    },
    { key: "CreateTime", formatter: this.standardDate },
    { key: "AvailabilityZone", sortable: true },
  ];

  async getResourcesForRegion(
    region: string,
    filterByVolumesId?: string[]
  ): Promise<AWSVolume[]> {
    const EC2 = await this.client(region);
    if (!EC2) {
      return [];
    }

    const params: DescribeVolumesRequest = {};
    if (filterByVolumesId) {
      params.Filters = [
        {
          Name: "volume-id",
          Values: filterByVolumesId,
        },
      ];
    }

    const data = await EC2.describeVolumes(params).promise();
    if (data.Volumes === undefined) {
      return [];
    }

    return data.Volumes;
  }
}
</script>
