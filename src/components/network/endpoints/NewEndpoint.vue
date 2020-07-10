<template>
  <div class="container mt-2 mb-2">
    <h2>Create a new VPC endpoint</h2>
    <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
      A VPC endpoint enables you to privately connect your VPC to supported AWS
      services and VPC endpoint services powered by AWS PrivateLink without
      requiring an internet gateway, NAT device, VPN connection, or AWS Direct
      Connect connection. Instances in your VPC do not require public IP
      addresses to communicate with resources in the service. Traffic between
      your VPC and the other service does not leave the Amazon network.
    </gl-alert>

    <gl-form @submit="createEndpoint">
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
        description="The VPC in which the endpoint will be used."
      />

      <gl-form-group
        id="endpoint-id"
        label="Endpoint type:"
        label-size="sm"
        label-for="endpoint-input"
      >
        <gl-form-select
          id="endpoint-input"
          v-model="form.endpointType"
          :options="[
            { value: '', text: 'Select an endpoint type' },
            'Gateway',
            'Interface',
          ]"
          required
        />
      </gl-form-group>

      <gl-form-group
        id="service-id"
        label="Service name:"
        label-size="sm"
        label-for="service-input"
      >
        <gl-form-select
          id="service-input"
          v-model="form.serviceName"
          :disabled="isServiceDisabled"
          :options="servicesOptions"
          required
        />
      </gl-form-group>

      <div class="row justify-content-between mt-3">
        <gl-button
          category="secondary"
          variant="danger"
          to="/network/endpoints"
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
          >Create new VPC endpoint
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
import EC2Client, { CreateVpcEndpointRequest } from "aws-sdk/clients/ec2";
import { Component, Watch } from "vue-property-decorator";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import RegionDropdown from "@/components/common/formComponents/RegionDropdown.vue";
import VpcDropdown from "@/components/common/formComponents/VpcDropdown.vue";
import { generateClientToken } from "@/utils/clientToken";

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
  },
})
export default class NewEndpoint extends DaintreeComponent {
  form = {
    region: "",
    vpcId: "",
    name: "",
    endpointType: "",
    serviceName: "",
  };

  services: string[] = [];
  isCreating = false;

  get createButtonDisabled(): boolean {
    return (
      Object.values(this.form).findIndex((value) => value === "") !== -1 ||
      this.isCreating
    );
  }

  get isServiceDisabled(): boolean {
    return this.form.region === "" || this.form.endpointType === "";
  }

  get servicesOptions(): ({ value: string; text: string } | string)[] {
    const options = [];
    if (this.isServiceDisabled) {
      options.push({
        value: "",
        text: "Select a region and an endpoint type before selecting a service",
      });
    } else {
      options.push({ value: "", text: "Select a service" });
    }

    options.push(...this.services);

    return options;
  }

  async EC2(region: string): Promise<EC2Client | undefined> {
    const credentials = await this.credentials();

    if (!credentials) {
      return;
    }

    return new EC2Client({ region, credentials });
  }

  @Watch("form.region")
  @Watch("form.endpointType")
  async getServices(): Promise<void> {
    this.services = [];
    this.form.serviceName = "";

    if (this.form.region === "" || this.form.endpointType === "") {
      return;
    }

    const EC2 = await this.EC2(this.form.region);
    if (!EC2) {
      return;
    }

    const services = await EC2.describeVpcEndpointServices().promise();
    if (services.ServiceDetails) {
      for (const service of services.ServiceDetails) {
        if (
          service.ServiceName &&
          service.ServiceType?.map((s) => s.ServiceType).includes(
            this.form.endpointType
          )
        ) {
          this.services.push(service.ServiceName);
        }
      }
    }
  }

  refresh(): void {
    this.getServices();
  }

  async createEndpoint(evt: Event): Promise<void> {
    evt.preventDefault();

    this.hideErrors("createEndpoint");

    const EC2 = await this.EC2(this.form.region);
    if (!EC2) {
      return;
    }

    const params: CreateVpcEndpointRequest = {
      VpcId: this.form.vpcId,
      ServiceName: this.form.serviceName,
      VpcEndpointType: this.form.endpointType,
      ClientToken: generateClientToken(),
      TagSpecifications: [
        {
          ResourceType: "vpc-endpoint",
          Tags: [{ Key: "Name", Value: this.form.name }],
        },
      ],
    };

    try {
      this.isCreating = true;
      const data = await EC2.createVpcEndpoint(params).promise();
      const verb =
        data.VpcEndpoint?.State?.toLowerCase() === "available"
          ? "Created"
          : "Creating";

      this.showAlert({
        variant: "success",
        text: verb + " endpoint with ID " + data.VpcEndpoint?.VpcEndpointId,
        key: "creatingEndpoint",
        resourceId: data.VpcEndpoint?.VpcEndpointId,
      });
      this.$router.push("/network/endpoints");
    } catch (err) {
      this.showError(err.message, "createEndpoint");
    } finally {
      this.isCreating = false;
    }
  }

  mounted(): void {
    this.$root.$on("refresh", this.refresh);
  }

  beforeDestroy(): void {
    this.$root.$off("refresh");
  }
}
</script>
