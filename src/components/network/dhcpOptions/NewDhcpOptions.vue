<template>
  <div class="container mt-2 mb-2">
    <h2>Create a new network interface</h2>
    <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
      An elastic network interface is a logical networking component in a VPC
      that represents a virtual network card.
    </gl-alert>

    <gl-form @submit="createDhcpOptions">
      <gl-form-group
        id="name-input-group"
        label="Name:"
        label-form="name-input"
        description="Create a tag with key 'Name' and the value you insert."
      >
        <gl-form-input
          id="name-input"
          v-model="form.name"
          placeholder="Enter name"
        />
      </gl-form-group>

      <RegionDropdown v-model="form.region" />

      <VpcDropdown
        v-model="form.vpcId"
        :region="form.region"
        description="The VPC in which the network interface will be used."
      />

      <SubnetDropdown
        v-model="form.subnetId"
        :region="form.region"
        :vpc-id="form.vpcId"
        description="The subnet in which the network interface will be used."
      />

      <div class="row justify-content-between mt-3">
        <gl-button
          category="secondary"
          variant="danger"
          to="/network/interfaces"
        >
          Cancel
        </gl-button>
        <gl-button
          class="float-right"
          type="submit"
          category="primary"
          variant="success"
          :disabled="createButtonDisabled"
          :loading="isCreating"
          >Create new network interface
        </gl-button>
      </div>
    </gl-form>
  </div>
</template>

<script lang="ts">
import {
  GlAlert,
  GlFormGroup,
  GlFormInputGroup,
  GlFormSelect,
  GlButton,
  GlForm,
  GlFormInput,
} from "@gitlab/ui";
import { BInputGroupText } from "bootstrap-vue";
import EC2Client, { CreateDhcpOptionsRequest } from "aws-sdk/clients/ec2";
import { Component } from "vue-property-decorator";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import RegionDropdown from "@/components/common/formComponents/RegionDropdown.vue";
import VpcDropdown from "@/components/common/formComponents/VpcDropdown.vue";
import SubnetDropdown from "@/components/common/formComponents/SubnetDropdown.vue";

@Component({
  components: {
    VpcDropdown,
    RegionDropdown,
    GlFormSelect,
    GlFormGroup,
    GlAlert,
    GlFormInputGroup,
    BInputGroupText,
    GlButton,
    GlForm,
    GlFormInput,
    SubnetDropdown,
  },
})
export default class NewDhcpOptions extends DaintreeComponent {
  form = {
    region: "",
    vpcId: "",
    subnetId: "",
    name: "",
  };

  isCreating = false;

  get createButtonDisabled(): boolean {
    return (
      Object.values(this.form).findIndex((value) => value === "") !== -1 ||
      this.isCreating
    );
  }

  async EC2(region: string): Promise<EC2Client | undefined> {
    const credentials = await this.credentials();

    if (!credentials) {
      return;
    }

    return new EC2Client({ region, credentials });
  }

  async createDhcpOptions(evt: Event): Promise<void> {
    evt.preventDefault();

    this.hideErrors("createDhcpOptions");

    const EC2 = await this.EC2(this.form.region);
    if (!EC2) {
      return;
    }

    const params: CreateDhcpOptionsRequest = {
      SubnetId: this.form.subnetId,
      TagSpecifications: [
        {
          ResourceType: "network-interface",
          Tags: [{ Key: "Name", Value: this.form.name }],
        },
      ],
    };

    try {
      this.isCreating = true;
      const data = await EC2.createDhcpOptions(params).promise();
      const verb =
        data.DhcpOptions?.Status?.toLowerCase() === "available"
          ? "Created"
          : "Creating";

      this.showAlert({
        variant: "success",
        text: verb + " dhcpOptions with ID " + data.DhcpOptions?.DhcpOptionsId,
        key: "creatingDhcpOptions",
        resourceId: data.DhcpOptions?.DhcpOptionsId,
      });
      this.$router.push("/network/interfaces");
    } catch (err) {
      this.showError(err.message, "createDhcpOptions");
    } finally {
      this.isCreating = false;
    }
  }
}
</script>
