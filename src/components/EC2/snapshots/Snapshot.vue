<template>
  <div>
    <gl-modal
      modal-id="delete-snapshot-modal"
      :title="`Delete ${snapshotName}`"
      no-fade
      :action-primary="deleteSnapshotButtonProps"
      :action-cancel="cancelProps"
      @primary="deleteSnapshot"
    >
      Are you sure that you want to delete this snapshot ({{ snapshotName }})?
    </gl-modal>
    <div class="col-12 text-center">
      <gl-button
        variant="danger"
        category="secondary"
        v-gl-modal-directive="'delete-snapshot-modal'"
        >Delete this snapshot
      </gl-button>
    </div>

    <gl-card class="col-12 mt-2" title="Snapshot description">
      {{ snapshot.Description }}
    </gl-card>

    <div class="row justify-content-around mt-2">
      <gl-card
        class="col-12 col-sm-5 col-md-3 mb-1 mb-sm-0"
        title="Snapshot Size"
      >
        {{ snapshot.VolumeSize }} GiBs
      </gl-card>
      <gl-card class="col-12 col-sm-5 col-md-3 mb-1 mb-sm-0" title="Volume ID">
        <gl-link :to="`/ec2/volumes?volumeId=${snapshot.VolumeId}`">{{
          snapshot.VolumeId
        }}</gl-link>
      </gl-card>

      <gl-card class="col-12 col-sm-5 col-md-3 mb-1 mb-sm-0" title="Encrypted">
        {{ snapshot.Encrypted }}
      </gl-card>
    </div>

    <div class="row justify-content-around mt-2">
      <gl-card
        class="col-12 col-sm-5 col-md-3 mb-1 mb-sm-0"
        title="Snapshot state"
      >
        <StateText :state="snapshot.State" />
      </gl-card>
      <gl-card class="col-12 col-sm-5 col-md-3 mb-1 mb-sm-0" title="Progress">
        <gl-progress-bar
          :value="parseInt(snapshot.Progress)"
          :variant="parseInt(snapshot.Progress) === 100 ? 'success' : 'primary'"
        />
      </gl-card>

      <gl-card class="col-12 col-sm-5 col-md-3 mb-1 mb-sm-0" title="Owner ID">
        {{ snapshot.OwnerId }}
      </gl-card>
    </div>

    <div class="row justify-content-around mt-2">
      <gl-card class="col-12 col-sm-5 col-md-3 mb-1 mb-sm-0" title="Region">
        <RegionText :region="snapshot.region" />
      </gl-card>
      <gl-card
        class="col-12 col-sm-5 col-md-3 mb-1 mb-sm-0"
        title="Creation time"
      >
        {{ snapshot.StartTime | standardDate }}
      </gl-card>

      <gl-card
        class="col-12 col-sm-5 col-md-3 mb-1 mb-sm-0"
        title="Snapshot ID"
      >
        {{ snapshot.SnapshotId }}
      </gl-card>
    </div>

    <h5 class="mt-3">Tags</h5>
    <!--I use key to force a rerender, I should study Vue reactivity better ¯\_(ツ)_/¯ -->
    <TagsTable
      :key="snapshot.SnapshotId"
      :tags="snapshot.Tags"
      :region="snapshot.region"
      :resource-id="snapshot.SnapshotId"
    />
  </div>
</template>

<script lang="ts">
import {
  GlEmptyState,
  GlSkeletonLoading,
  GlTable,
  GlCard,
  GlAlert,
  GlButton,
  GlModal,
  GlTabs,
  GlModalDirective,
  GlTab,
  GlButtonGroup,
  GlLink,
  GlProgressBar,
} from "@gitlab/ui";
import EC2Client from "aws-sdk/clients/ec2";
import { Component, Prop, Watch } from "vue-property-decorator";
import TagsTable from "@/components/common/TagsTable.vue";
import SubnetTab from "@/components/network/subnets/SubnetTab.vue";
import { snapshots } from "@/components/EC2/snapshots/snapshot";
import SnapshotWithRegion = snapshots.SnapshotWithRegion;
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import StateText from "@/components/common/StateText.vue";
import RegionText from "@/components/common/RegionText.vue";

@Component({
  components: {
    TagsTable,
    GlTable,
    GlEmptyState,
    GlSkeletonLoading,
    GlCard,
    GlAlert,
    GlButton,
    GlModal,
    GlProgressBar,
    SubnetTab,
    StateText,
    RegionText,
    GlTab,
    GlTabs,
    GlButtonGroup,
    GlLink,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
  },
})
export default class Snapshot extends DaintreeComponent {
  @Prop(Object) readonly snapshot!: SnapshotWithRegion;

  deleteSnapshotButtonProps = {
    text: "Delete snapshot",
    attributes: {
      variant: "danger",
    },
  };

  cancelProps = {
    text: "Cancel",
  };

  get snapshotName() {
    const tagName = this.extractNameFromTags(this.snapshot.Tags || []);

    return tagName || this.snapshot.SnapshotId;
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

<style scoped>
.hidden-header {
  display: none;
}
</style>
