<template>
  <div>
    <Header @refresh="regionChanged" :loading="loadingCount > 0" />
    <div class="container mt-2">
      <h2>Create a new subnet</h2>
      <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
        Specify your subnet's IP address block in CIDR format; for example,
        10.0.0.0/24. IPv4 block sizes must be between a /16 netmask and /28
        netmask, and can be the same size as your VPC. An IPv6 CIDR block must
        be a /64 CIDR block.
      </gl-alert>
      <gl-form-group
        id="region-id"
        label="Region"
        label-size="sm"
        description="To see other regions, enable them in the settings"
        label-for="region-input"
      >
        <gl-form-select
          id="region-input"
          v-model="selectedRegion"
          :options="this.$store.getters['sts/regions']"
          @change="regionChanged"
        />
      </gl-form-group>
      <gl-form-input-group
        class="mt-3"
        v-model="subnetName"
        placeholder="Create a tag with key 'Name' and the value you insert."
      >
        <template #prepend>
          <b-input-group-text>Name</b-input-group-text>
        </template>
      </gl-form-input-group>

      <gl-form-group
        id="vpc-id"
        label="Vpc"
        label-size="sm"
        description="VPC to use for this subnet."
        label-for="vpc-input"
        class="mt-2"
      >
        <gl-form-select
          id="vpc-input"
          :disabled="selectedRegion === '' || loadingCount > 0"
          v-model="selectedVpc"
          :options="vpcsOptions"
        />
      </gl-form-group>

      <gl-form-group
        id="az-id"
        label="Availability zone"
        label-size="sm"
        description='The availability zone where this subnet will reside. Select "No preference" to let Amazon choose an Availability Zone for you'
        label-for="az-input"
        class="mt-2"
      >
        <gl-form-select
          id="az-input"
          :disabled="selectedRegion === '' || loadingCount > 0"
          v-model="selectedAz"
          :options="azOptions"
        />
      </gl-form-group>

      <gl-form-input-group
        required
        v-model="cidrBlock"
        class="mt-3"
        placeholder="The range of IPv4 addresses for your subnet in CIDR block format."
      >
        <template #prepend>
          <b-input-group-text>IPv4 CIDR block</b-input-group-text>
        </template>
      </gl-form-input-group>
      <div class="row justify-content-between mt-3">
        <gl-button category="secondary" variant="danger" to="/network/subnets">
          Cancel
        </gl-button>
        <gl-button
          class="float-right"
          category="primary"
          variant="success"
          :disabled="!canClick"
          @click="createSubnet"
          >Create subnet
        </gl-button>
      </div>
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
  GlButton
} from "@gitlab/ui";
import { BInputGroupText } from "bootstrap-vue";
import EC2Client from "aws-sdk/clients/ec2";
import { Component } from "vue-property-decorator";
import Notifications from "@/mixins/notifications";
import {
  AvailabilityZoneList,
  CreateSubnetRequest,
  VpcList
} from "aws-sdk/clients/ec2";
import { mixins } from "vue-class-component";
import { Formatters } from "@/mixins/formatters";

@Component({
  components: {
    Header,
    GlFormSelect,
    GlFormGroup,
    GlAlert,
    GlFormInputGroup,
    BInputGroupText,
    GlButton
  }
})
export default class NewSubnet extends mixins(Notifications, Formatters) {
  selectedRegion = "";
  selectedVpc = "";
  selectedAz = "No preference";

  cidrBlock = "";
  subnetName = "";

  vpcs: VpcList = [];
  az: AvailabilityZoneList = [];
  loadingCount = 0;

  get canClick() {
    return this.selectedRegion !== "" && this.selectedVpc !== "";
  }

  get vpcsOptions(): string[] {
    const options: string[] = [];
    this.vpcs.forEach(s => {
      let option = "";
      if (s.VpcId) option += s.VpcId;
      const name = this.extractNameFromTags(s.Tags || []);
      if (name) option += ` - ${name}`;

      const cidr = s.CidrBlock;
      if (cidr) option += ` (${cidr})`;

      options.push(option);
    });
    return options;
  }

  get azOptions(): string[] {
    const options: string[] = [];
    this.az.forEach(az => {
      if (az.ZoneName) options.push(az.ZoneName);
    });

    options.push("No preference");
    return options;
  }

  get EC2() {
    return new EC2Client({
      region: this.selectedRegion,
      credentials: this.$store.getters["sts/credentials"]
    });
  }

  createSubnet() {
    const params: CreateSubnetRequest = {
      CidrBlock: this.cidrBlock,
      VpcId: this.selectedVpc.split(" ")[0]
    };

    if (this.selectedAz !== "No preference") {
      params.AvailabilityZone = this.selectedAz;
    }
    this.EC2.createSubnet(params, (err, data) => {
      if (err) {
        this.showError(err.message, "createSubnet");
      } else {
        this.hideErrors("createSubnet");

        //We cannot set tags with `createSubnet`
        if (this.subnetName && data.Subnet && data.Subnet.SubnetId) {
          const params = {
            Resources: [data.Subnet.SubnetId],
            Tags: [{ Key: "Name", Value: this.subnetName }]
          };
          this.EC2.createTags(params, err => {
            if (err) {
              this.showError(err.message, "createSubnet");
            } else {
              this.$router.push(
                `/network/subnets?subnetId=${data.Subnet?.SubnetId}`
              );
            }
          });
        } else {
          this.$router.push(
            `/network/subnets?subnetId=${data.Subnet?.SubnetId}`
          );
        }
      }
    });
  }

  getVpcsForCurrentRegion() {
    this.hideErrors("getVpcs");
    if (this.selectedRegion === "") {
      this.vpcs = [];
    } else {
      this.loadingCount++;
      this.EC2.describeVpcs(
        { Filters: [{ Name: "state", Values: ["available"] }] },
        (err, data) => {
          this.loadingCount--;
          if (err) {
            this.showError(err.message, "getVpcs");
          } else if (data.Vpcs) {
            this.vpcs = data.Vpcs;
          }
        }
      );
    }
  }

  getAzForCurrentRegion() {
    this.hideErrors("getAz");
    if (this.selectedRegion === "") {
      this.vpcs = [];
    } else {
      this.loadingCount++;
      this.EC2.describeAvailabilityZones(
        { Filters: [{ Name: "state", Values: ["available"] }] },
        (err, data) => {
          this.loadingCount--;
          if (err) {
            this.showError(err.message, "getAz");
          } else if (data.AvailabilityZones) {
            this.az = data.AvailabilityZones;
          }
        }
      );
    }
  }

  regionChanged() {
    this.getVpcsForCurrentRegion();
    this.getAzForCurrentRegion();
  }
}
</script>

<style scoped></style>
