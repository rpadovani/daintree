<template>
  <div class="container-fluid">
    <gl-alert
      v-if="errorMessage !== ''"
      variant="danger"
      :dismissible="false"
      >{{ instancesError }}</gl-alert
    >
    <gl-table
      :items="snapshots"
      :fields="fields"
      :busy="isLoading"
      hover
      small
      borderless
      show-empty
      empty-text="Daintree hasn't found any snapshot associated to this volume!"
    >
      <template v-slot:table-busy>
        <gl-skeleton-loading />
      </template>

      <template v-slot:cell(state)="data">
        <StateText :state="data.value" />
      </template>

      <template v-slot:cell(SnapshotId)="data">
        <gl-link :to="`/ec2/snapshots?snapshotId=${data.value}`">
          {{ data.value }}
        </gl-link>
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
  </div>
</template>

<script lang="ts">
import EC2Client, {
  DescribeSnapshotsRequest,
  SnapshotList,
} from "aws-sdk/clients/ec2";

import Header from "@/components/Header/Header.vue";
import RegionText from "@/components/common/RegionText.vue";
import {
  GlButton,
  GlDrawer,
  GlEmptyState,
  GlFormInput,
  GlIcon,
  GlSkeletonLoading,
  GlTable,
  GlLink,
  GlAlert,
  GlTooltipDirective,
} from "@gitlab/ui";
import Component from "vue-class-component";
import Snapshot from "@/components/EC2/snapshots/Snapshot.vue";
import StateText from "@/components/common/StateText.vue";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import { Prop, Watch } from "vue-property-decorator";

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
    GlAlert,
  },
  directives: {
    "gl-tooltip": GlTooltipDirective,
  },
})
export default class SnapshotsTab extends DaintreeComponent {
  @Prop(String) volumeId!: string;
  @Prop(String) region!: string;

  errorMessage = "";
  snapshots: SnapshotList = [];
  isLoading = false;

  fields = [
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: this.extractNameFromTags,
    },
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
  ];

  async getVolumes(): Promise<void> {
    this.isLoading = true;
    const credentials = await this.credentials();

    if (credentials === undefined) {
      this.isLoading = false;

      return;
    }

    const EC2 = new EC2Client({ region: this.region, credentials });
    if (!EC2 || !this.accountId) {
      this.snapshots = [];
      this.isLoading = false;
      return;
    }

    const params: DescribeSnapshotsRequest = {
      Filters: [{ Name: "volume-id", Values: [this.volumeId] }],
    };

    try {
      const data = await EC2.describeSnapshots(params).promise();
      if (data.Snapshots === undefined) {
        this.snapshots = [];
        this.errorMessage = "";
        return;
      }

      this.snapshots = data.Snapshots;
      this.errorMessage = "";
    } catch (err) {
      this.errorMessage = err;
      this.snapshots = [];
      return;
    } finally {
      this.isLoading = false;
    }
  }

  @Watch("volumeId")
  onVolumeIdChanged(): void {
    this.getVolumes();
  }

  mounted(): void {
    this.getVolumes();
  }
}
</script>

<style scoped></style>
