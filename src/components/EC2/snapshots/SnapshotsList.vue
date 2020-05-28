<template>
  <div>
    <Header v-on:refresh="getAllResources" :loading="loadingCount > 0" />

    <gl-drawer
      :open="drawerOpened && selectedResourceKey !== ''"
      @close="close"
      style="min-width: 80%;"
    >
      <template #header>{{ selectedResourceTitle }}</template>

      <Snapshot :snapshot="selectedResource" v-on:deleted="close" />
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
          to="/ec2/snapshots/new"
          >Create new snapshot
        </gl-button>
      </div>
      <gl-table
        :items="resourcesAsList"
        :fields="fields"
        :filter="filter"
        :busy="loadingCount > 0"
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
        <template v-slot:cell(region)="data">
          <RegionText :region="data.value" />
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
          v-if="loadingCount > 0 && resourcesAsList.length < 1"
        />

        <gl-empty-state
          class="mt-5"
          v-if="loadingCount === 0 && resourcesAsList.length === 0"
          title="No snapshot found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <gl-button icon="plus" variant="success" to="/ec2/snapshots/new"
              >Create new snapshot
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
  DescribeSnapshotsRequest,
  Snapshot as AWSSnapshot,
} from "aws-sdk/clients/ec2";

import Header from "@/components/Header/Header.vue";
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
import Snapshot from "@/components/EC2/snapshots/Snapshot.vue";
import StateText from "@/components/common/StateText.vue";

@Component({
  components: {
    Snapshot,
    Header,
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
export default class SnapshotsList extends NetworkComponent<
  AWSSnapshot,
  "SnapshotId" | "State"
> {
  resourceName = "snapshot";
  canCreate = true;
  resourceUniqueKey: "SnapshotId" = "SnapshotId";
  resourceStateKey: "State" = "State";
  workingStates = ["creating", "pending", "deleting"];

  fields = [
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: this.extractNameFromTags,
    },
    { key: "Description" },
    { key: "SnapshotId", sortable: true },
    "State",
    "Progress",
    { key: "Encrypted", label: "Encrypted", class: "text-center" },
    {
      key: "VolumeSize",
      sortable: true,
      formatter: (value: string): string => `${value} GiB`,
      label: "Size",
    },

    { key: "StartTime", formatter: this.standardDate, sortable: true },
    { key: "region", sortable: true },
  ];

  async getResourcesForRegion(
    region: string,
    filterBySnapshotsId?: string[]
  ): Promise<AWSSnapshot[]> {
    const EC2 = await this.client(region);
    if (!EC2 || !this.accountId) {
      return [];
    }

    const params: DescribeSnapshotsRequest = {
      Filters: [{ Name: "owner-id", Values: [this.accountId] }],
    };

    if (filterBySnapshotsId) {
      params.SnapshotIds = filterBySnapshotsId;
    }

    try {
      const data = await EC2.describeSnapshots(params).promise();
      if (data.Snapshots === undefined) {
        return [];
      }

      return data.Snapshots;
    } catch (err) {
      if (err.code === "InvalidSnapshot.NotFound") {
        //We were looking for a snapshot that doesn't exist anymore, it's not an error
        return [];
      }
      this.showError(`[${region}] ` + err, `${region}#loadingSnapshots`);
      return [];
    }
  }

  destroyed(): void {
    this.$store.commit("notifications/dismissByKey", "loadingSnapshots");
  }
}
</script>

<style scoped></style>
