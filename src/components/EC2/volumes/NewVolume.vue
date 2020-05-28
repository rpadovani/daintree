<template>
  <div>
    <Header :loading="this.loadingCount > 0" />
    <div class="container mt-2">
      <h2>Create a new EBS</h2>
      <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
        Amazon Elastic Block Store (EBS) is an easy to use, high performance
        block storage service designed for use with Amazon Elastic Compute Cloud
        (EC2) for both throughput and transaction intensive workloads at any
        scale. You can choose from four different volume types to balance
        optimal price and performance.
      </gl-alert>
      <gl-form @submit="createVolume">
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
          id="az-id"
          label="Availability zone"
          label-size="sm"
          label-for="az-input"
        >
          <gl-form-select
            id="az-input"
            v-model="availabilityZone"
            :options="azsAsList"
            :disabled="!selectedRegion"
          />
        </gl-form-group>

        <gl-form-input-group
          class="mt-3"
          v-model="volumeName"
          placeholder="Create a tag with key 'Name' and the value you insert."
        >
          <template #prepend>
            <b-input-group-text>Name</b-input-group-text>
          </template>
        </gl-form-input-group>

        <gl-form-group
          id="volume-type-id"
          class="mt-2"
          label="Volume type"
          label-size="sm"
          label-for="volume-type-input"
          description="Gp2 for General Purpose SSD, io1 for Provisioned IOPS SSD, st1 for Throughput Optimized HDD, sc1 for Cold HDD, or standard for Magnetic volumes."
          required
        >
          <gl-form-select
            id="volume-type-input"
            v-model="volumeType"
            :options="volumeTypes"
          />
        </gl-form-group>

        <gl-form-input-group
          class="mt-3"
          v-model="volumeSize"
          type="number"
          placeholder="Select a size for your EBS."
          :min="minSize"
          :max="maxSize"
          :state="sizeValidationState"
        >
          <template #prepend>
            <b-input-group-text>Size</b-input-group-text>
          </template>
          <template #append>
            <b-input-group-text>GiB</b-input-group-text>
          </template>
        </gl-form-input-group>
        <p>{{ descriptionForSize }}</p>

        <div class="row justify-content-between mt-3">
          <gl-button category="secondary" variant="danger" to="/ec2/volumes">
            Cancel
          </gl-button>
          <gl-button
            class="float-right"
            type="submit"
            category="primary"
            variant="success"
            :disabled="createButtonDisabled"
            >Create new EBS
          </gl-button>
        </div>
      </gl-form>
    </div>
  </div>
</template>

<script lang="ts">
import Header from "@/components/Header/Header.vue";
import {
  GlAlert,
  GlFormGroup,
  GlFormInputGroup,
  GlFormSelect,
  GlButton,
  GlForm,
} from "@gitlab/ui";
import { BInputGroupText } from "bootstrap-vue";
import EC2Client, {
  AvailabilityZoneList,
  CreateVolumeRequest,
} from "aws-sdk/clients/ec2";
import { Component } from "vue-property-decorator";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import { isString } from "@/utils/isString";

@Component({
  components: {
    Header,
    GlFormSelect,
    GlFormGroup,
    GlAlert,
    GlFormInputGroup,
    BInputGroupText,
    GlButton,
    GlForm,
  },
})
export default class NewVolume extends DaintreeComponent {
  selectedRegion = "";
  volumeName = "";
  azs: AvailabilityZoneList | undefined = [];
  loadingCount = 0;
  availabilityZone = "";
  volumeSize = 0;

  readonly volumeTypes = ["standard", "io1", "gp2", "sc1", "st1"];
  volumeType: "standard" | "io1" | "gp2" | "sc1" | "st1" = "gp2";

  regionChanged(): void {
    this.loadAz();
  }

  get azsAsList(): string[] {
    if (!this.azs) {
      return [];
    }
    return this.azs.map((az) => az.ZoneName).filter(isString);
  }

  get minSize(): number {
    switch (this.volumeType) {
      case "standard":
        return 1;
      case "io1":
        return 4;
      case "gp2":
        return 1;
      case "sc1":
      case "st1":
        return 500;
      default:
        return 0;
    }
  }

  get maxSize(): number {
    switch (this.volumeType) {
      case "standard":
        return 1024;
      case "io1":
      case "gp2":
      case "sc1":
      case "st1":
        return 16384;
      default:
        return 0;
    }
  }

  get sizeValidationState(): boolean {
    return this.volumeSize >= this.minSize && this.volumeSize <= this.maxSize;
  }

  get descriptionForSize(): string {
    return `The size for volumes of type ${this.volumeType} must be between ${this.minSize} GiB and ${this.maxSize} GiB`;
  }

  get createButtonDisabled(): boolean {
    if (this.selectedRegion === "") {
      return true;
    }

    if (this.availabilityZone === "") {
      return true;
    }

    return !this.sizeValidationState;
  }

  async loadAz(): Promise<void> {
    this.hideErrors("createEbs");
    if (this.selectedRegion === "") {
      this.azs = [];
    } else {
      this.loadingCount++;

      const credentials = await this.credentials();

      const EC2 = new EC2Client({
        region: this.selectedRegion,
        credentials,
      });

      try {
        const response = await EC2.describeAvailabilityZones().promise();
        this.azs = response.AvailabilityZones;
      } catch (err) {
        this.showError(err, "createEbs");
      } finally {
        this.loadingCount--;
      }
    }
  }

  async createVolume(evt: Event): Promise<void> {
    evt.preventDefault();
    const credentials = await this.credentials();
    const EC2 = new EC2Client({ region: this.selectedRegion, credentials });
    try {
      this.hideErrors("createVolume");

      const params: CreateVolumeRequest = {
        AvailabilityZone: this.availabilityZone,
        Size: this.volumeSize,
        VolumeType: this.volumeType,
      };

      if (this.volumeName) {
        params.TagSpecifications = [
          {
            ResourceType: "volume",
            Tags: [
              {
                Key: "Name",
                Value: this.volumeName,
              },
            ],
          },
        ];
      }

      const data = await EC2.createVolume(params).promise();

      this.showAlert({
        variant: "success",
        text: "Created EBS with ID " + data.VolumeId,
        key: "creatingVolume",
        resourceId: data.VolumeId,
      });

      this.$router.push(`/ec2/volumes`);
    } catch (err) {
      this.showError(err.message, "createVolume");
    }
  }
}
</script>

<style scoped></style>
