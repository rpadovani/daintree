<template>
  <div>
    <Header @refresh="regionChanged" :loading="loadingCount > 0" />
    <div class="container mt-2">
      <h2>Create a new security group</h2>
      <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
        A security group acts as a virtual firewall for your instance to control
        inbound and outbound traffic. To create a new security group, complete
        the fields below.
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
        v-model="securityGroupName"
        placeholder="Name cannot be edited after creation."
      >
        <template #prepend>
          <b-input-group-text>Name</b-input-group-text>
        </template>
      </gl-form-input-group>

      <gl-form-input-group
        class="mt-3"
        v-model="securityGroupDescription"
        placeholder="Insert a description"
      >
        <template #prepend>
          <b-input-group-text>Description</b-input-group-text>
        </template>
      </gl-form-input-group>

      <gl-form-group
        id="vpc-id"
        label="Vpc"
        label-size="sm"
        description="Select a VPC to which attach your new Security Group."
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

      <div class="row justify-content-between mt-3">
        <gl-button
          category="secondary"
          variant="danger"
          to="/network/securityGroups"
        >
          Cancel
        </gl-button>
        <gl-button
          :disabled="!canClick"
          category="primary"
          variant="success"
          @click="createSecurityGroup"
          >Create security group
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
import AWS from "aws-sdk";
import { Component, Watch } from "vue-property-decorator";
import Notifications from "@/mixins/notifications";
import { VpcList } from "aws-sdk/clients/ec2";
import { Formatters } from "@/mixins/formatters";
import { mixins } from "vue-class-component";

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
export default class NewSecurityGroup extends mixins(
  Notifications,
  Formatters
) {
  selectedRegion = "";
  selectedVpc = "";

  securityGroupName = "";
  securityGroupDescription = "";
  vpcs: VpcList = [];
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

      options.push(option);
    });
    return options;
  }

  regionChanged() {
    this.getVpcsForCurrentRegion();
  }

  createSecurityGroup() {
    const EC2 = new AWS.EC2({ region: this.selectedRegion });
    EC2.createSecurityGroup(
      {
        VpcId: this.selectedVpc.split(" ")[0],
        GroupName: this.securityGroupName,
        Description: this.securityGroupDescription
      },
      (err, data) => {
        if (err) {
          this.showError(err.message, "createSecurityGroup");
        } else {
          this.hideErrors("createSecurityGroup");
          this.$router.push(
            `/network/securityGroups?securityGroupId=${data.GroupId}`
          );
        }
      }
    );
  }

  getVpcsForCurrentRegion() {
    this.hideErrors("createSecurityGroup");
    if (this.selectedRegion === "") {
      this.vpcs = [];
    } else {
      const EC2 = new AWS.EC2({ region: this.selectedRegion });

      this.loadingCount++;
      EC2.describeVpcs(
        { Filters: [{ Name: "state", Values: ["available"] }] },
        (err, data) => {
          this.loadingCount--;
          if (err) {
            this.showError(err.message, "createSecurityGroup");
          } else if (data.Vpcs) {
            this.vpcs = data.Vpcs;
          }
        }
      );
    }
  }

  get currentRoleIndex(): number {
    return this.$store.getters["sts/currentRoleIndex"];
  }

  @Watch("currentRoleIndex")
  onCurrentRoleIndexChanged() {
    this.regionChanged();
  }
}
</script>

<style scoped></style>
