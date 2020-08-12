<template>
  <div>
    <DeleteButtonWithConfirmation
      class="text-center"
      resource-type="snapshot"
      :resource-id="snapshot.SnapshotId"
      :resource-name="snapshotName"
      @primary="deleteSnapshot"
    />

    <DrawerCards :cards="cards" />

    <h5 class="mt-3">Tags</h5>
    <TagsTable
      :tags="snapshot.Tags"
      :region="snapshot.region"
      :resource-id="snapshot.SnapshotId"
    />
  </div>
</template>

<script lang="ts">
import EC2Client from "aws-sdk/clients/ec2";
import { Component, Prop } from "vue-property-decorator";
import TagsTable from "@/components/common/TagsTable.vue";
import { snapshots } from "@/components/EC2/snapshots/snapshot";
import SnapshotWithRegion = snapshots.SnapshotWithRegion;
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import DrawerCards from "@/components/common/DrawerCards.vue";
import { CardContent } from "@/components/common/cardContent";
import DeleteButtonWithConfirmation from "@/components/common/DeleteButtonWithConfirmation.vue";
import { extractNameFromEC2Tags } from "@/components/common/tags";

@Component({
  components: {
    DrawerCards,
    TagsTable,
    DeleteButtonWithConfirmation,
  },
})
export default class Snapshot extends DaintreeComponent {
  @Prop(Object) readonly snapshot!: SnapshotWithRegion;

  get cards(): CardContent[] {
    return [
      {
        title: "Snapshot description",
        value: this.snapshot.Description,
        helpText: "The description for the snapshot.",
      },
      {
        title: "Snapshot Size",
        value: `${this.snapshot.VolumeSize} GiBs`,
        helpText: "The size of the volume, in GiB.",
      },
      {
        title: "Volume ID",
        value: this.snapshot.VolumeId,
        linkTo: `/ec2/volumes?volumeId=${this.snapshot.VolumeId}`,
        helpText:
          "The ID of the volume that was used to create the snapshot. Snapshots created by the CopySnapshot action have an arbitrary volume ID that should not be used for any purpose.",
      },
      {
        title: "Encrypted",
        value: this.snapshot.Encrypted,
        helpText: "Indicates whether the snapshot is encrypted.",
      },
      { title: "Snapshot state", isState: true, value: this.snapshot.State },
      {
        title: "Progress",
        value: this.snapshot.Progress,
        isProgress: true,
        helpText: `The progress of the snapshot, as a percentage.`,
      },
      { title: "Owner ID", value: this.snapshot.OwnerId },
      { title: "Region", isRegion: true, value: this.snapshot.region },
      {
        title: "Creation time",
        value: this.snapshot.StartTime
          ? this.standardDate(this.snapshot.StartTime)
          : undefined,
        helpText: `The time stamp when the snapshot was initiated.`,
      },
      {
        title: "Snapshot ID",
        value: this.snapshot.SnapshotId,
        helpText:
          "The ID of the snapshot. Each snapshot receives a unique identifier when it is created.",
      },
    ];
  }

  get snapshotName(): string | undefined {
    return extractNameFromEC2Tags(this.snapshot.Tags || []);
  }

  async EC2Client() {
    const credentials = await this.credentials();

    if (credentials === undefined) {
      return;
    }

    return new EC2Client({ region: this.snapshot.region, credentials });
  }

  async deleteSnapshot() {
    if (!this.snapshot.SnapshotId) {
      return;
    }

    const EC2 = await this.EC2Client();

    if (!EC2) {
      return;
    }

    try {
      this.hideErrors("deleteSnapshot");
      await EC2.deleteSnapshot({
        SnapshotId: this.snapshot.SnapshotId,
      }).promise();

      this.showAlert({
        variant: "info",
        text: `Deleting snapshot ${this.snapshot.SnapshotId}`,
        key: "deletingSnapshot",
        resourceId: this.snapshot.SnapshotId,
      });
      this.$emit("deleted");
    } catch (err) {
      this.showError(err.message, "deleteSnapshot");
    }
  }
}
</script>
