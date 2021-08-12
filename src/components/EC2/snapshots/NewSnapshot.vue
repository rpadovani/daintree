<template>
  <div class="container mt-2">
    <h2>Create a new snapshot</h2>
    <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
      You can create a point-in-time snapshot of an EBS volume and use it as a
      baseline for new volumes or for data backup. If you make periodic
      snapshots of a volume, the snapshots are incremental—the new snapshot
      saves only the blocks that have changed since your last snapshot.
    </gl-alert>
    <gl-form @submit="createSnapshot">
      <gl-form-group
        id="region-id"
        label="Region"
        label-size="sm"
        description="To see other regions, enable them in the settings"
        label-for="region-input"
        required
      >
        <gl-form-select
          id="region-input"
          v-model="selectedRegion"
          :options="regionsEnabled"
          @change="regionChanged"
        />
      </gl-form-group>

      <gl-form-group
        id="volume-id"
        label="Volume"
        label-size="sm"
        label-for="volume-input"
        description="The EBS volume from which to create the snapshot"
      >
        <gl-form-select
          id="volume-input"
          v-model="selectedVolume"
          :options="volumesAsList"
          :disabled="!selectedRegion"
        />
      </gl-form-group>

      <gl-form-input-group
        class="mt-3"
        v-model="snapshotName"
        placeholder="Create a tag with key 'Name' and the value you insert."
      >
        <template #prepend>
          <b-input-group-text>Name</b-input-group-text>
        </template>
      </gl-form-input-group>

      <gl-form-input-group
        class="mt-3"
        v-model="snapshotDescription"
        placeholder="A description for the snapshot."
      >
        <template #prepend>
          <b-input-group-text>Description</b-input-group-text>
        </template>
      </gl-form-input-group>

      <div class="row justify-content-between mt-3">
        <gl-button category="secondary" to="/ec2/snapshots"> Cancel </gl-button>
        <gl-button
          class="float-right"
          type="submit"
          category="primary"
          variant="success"
          :disabled="createButtonDisabled"
          >Create new snapshot
        </gl-button>
      </div>
    </gl-form>
  </div>
</template>

<script lang="ts">
import {
  GlAlert,
  GlButton,
  GlForm,
  GlFormGroup,
  GlFormInputGroup,
  GlFormSelect,
} from "@gitlab/ui";
import { BInputGroupText } from "bootstrap-vue";
import EC2Client, {
  CreateSnapshotRequest,
  Tag,
  VolumeList,
} from "aws-sdk/clients/ec2";
import { Component } from "vue-property-decorator";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import { isString } from "@/utils/isString";

@Component({
  components: {
    GlFormSelect,
    GlFormGroup,
    GlAlert,
    GlFormInputGroup,
    BInputGroupText,
    GlButton,
    GlForm,
  },
})
export default class NewSnapshot extends DaintreeComponent {
  selectedRegion = "";
  snapshotName = "";
  volumes: VolumeList | undefined = [];
  loadingCount = 0;
  selectedVolume = "";
  snapshotDescription = "";

  regionChanged(): void {
    this.loadVolumes();
  }

  get volumesAsList(): { value: string; text: string }[] {
    if (!this.volumes) {
      return [];
    }

    return this.volumes.map((volume) => {
      const nameTag = volume.Tags?.filter((v: Tag) => v.Key === "Name");

      if (nameTag && nameTag.length > 0) {
        return {
          text: `${volume.VolumeId} - ${nameTag[0].Value}`,
          value: volume.VolumeId || "",
        };
      }

      return { text: volume.VolumeId || "", value: volume.VolumeId || "" };
    });
  }

  get createButtonDisabled(): boolean {
    if (this.selectedRegion === "") {
      return true;
    }

    return this.selectedVolume === "";
  }

  async loadVolumes(): Promise<void> {
    this.hideErrors("createSnapshot");
    if (this.selectedRegion === "") {
      this.volumes = [];
    } else {
      this.incrementLoadingCount();

      const credentials = await this.credentials();

      const EC2 = new EC2Client({
        region: this.selectedRegion,
        credentials,
      });

      try {
        const response = await EC2.describeVolumes().promise();
        this.volumes = response.Volumes;
      } catch (err) {
        this.showError(err, "createSnapshot");
      } finally {
        this.decreaseLoadingCount();
      }
    }
  }

  async createSnapshot(evt: Event): Promise<void> {
    evt.preventDefault();
    const credentials = await this.credentials();
    const EC2 = new EC2Client({ region: this.selectedRegion, credentials });
    try {
      this.hideErrors("createSnapshot");

      const params: CreateSnapshotRequest = {
        VolumeId: this.selectedVolume,
        Description: this.snapshotDescription,
      };

      if (this.snapshotName) {
        params.TagSpecifications = [
          {
            ResourceType: "snapshot",
            Tags: [
              {
                Key: "Name",
                Value: this.snapshotName,
              },
            ],
          },
        ];
      }

      const data = await EC2.createSnapshot(params).promise();

      this.showAlert({
        variant: "success",
        text: "Creating snapshot with ID " + data.SnapshotId,
        key: "creatingSnapshot",
        resourceId: data.SnapshotId,
      });

      this.$router.push(`/ec2/snapshots`);
    } catch (err) {
      this.showError(err.message, "createSnapshot");
    }
  }

  mounted(): void {
    if (isString(this.$route.query.region)) {
      this.selectedRegion = this.$route.query.region;
      this.loadVolumes();
    }

    if (isString(this.$route.query.volumeId)) {
      this.selectedVolume = this.$route.query.volumeId;
    }

    this.$root.$on("refresh", this.loadVolumes);
  }

  beforeDestroy(): void {
    this.$root.$off("refresh");
  }
}
</script>
