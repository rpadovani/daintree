<template>
  <div class="container mt-2">
    <h2>Create a new Nat</h2>
    <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
      You can use a network address translation (NAT) gateway to enable
      instances in a private subnet to connect to the internet or other AWS
      services, but prevent the internet from initiating a connection with those
      instances. For more information about NAT, see
      <a
        href="https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat.html"
        target="_blank"
        >the AWS Guide</a
      >.
    </gl-alert>
    <gl-form-group
      id="region-id"
      label="Region"
      label-size="sm"
      description="To see other regions, enable them in the settings, in the top right of the page."
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
      v-model="natName"
      placeholder="Create a tag with key 'Name' and the value you insert."
    >
      <template #prepend>
        <b-input-group-text>Name</b-input-group-text>
      </template>
    </gl-form-input-group>

    <gl-form-group
      id="subnet-id"
      label="Subnet"
      label-size="sm"
      description="Select a public subnet in which to create the Nat Gateway"
      label-for="subnet-input"
      class="mt-2"
    >
      <gl-form-select
        id="subnet-input"
        :disabled="selectedRegion === ''"
        v-model="selectedSubnet"
        :options="subnetsOptions"
      />
    </gl-form-group>

    <div class="row mt-2 justify-content-between">
      <gl-form-group
        id="eip-id"
        label="Elastic IP"
        label-size="sm"
        description="Assign an Elastic IP address to the NAT gateway"
        label-for="eip-input"
        class="col-9"
      >
        <gl-form-select
          id="eip-input"
          :disabled="selectedRegion === ''"
          v-model="selectedEip"
          :options="eipOptions"
          :value="selectedEip"
        />
      </gl-form-group>
      <gl-button
        category="secondary"
        variant="success"
        size="medium"
        class="mt-4"
        style="height: 100%"
        :disabled="selectedRegion === ''"
        @click="newIp"
        :loading="allocateLoading"
      >
        Allocate a new Elastic IP
      </gl-button>
    </div>

    <div class="row justify-content-between mt-3">
      <gl-button category="secondary" variant="danger" to="/network/nats">
        Cancel
      </gl-button>
      <gl-button
        :disabled="!canClick"
        category="primary"
        variant="success"
        @click="createNat"
        >Create NAT
      </gl-button>
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
} from "@gitlab/ui";
import { BInputGroupText } from "bootstrap-vue";
import EC2Client from "aws-sdk/clients/ec2";
import { Component, Watch } from "vue-property-decorator";
import {
  AddressList,
  CreateNatGatewayRequest,
  SubnetList,
} from "aws-sdk/clients/ec2";
import { mixins } from "vue-class-component";
import { Formatters } from "@/mixins/formatters";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";

@Component({
  components: {
    Header,
    GlFormSelect,
    GlFormGroup,
    GlAlert,
    GlFormInputGroup,
    BInputGroupText,
    GlButton,
  },
})
export default class NewNat extends mixins(DaintreeComponent, Formatters) {
  selectedRegion = "";
  selectedSubnet = "";
  selectedEip = "";
  natName = "";
  subnets: SubnetList = [];
  eips: AddressList = [];
  loadingCount = 0;
  allocateLoading = false;

  get canClick() {
    return (
      this.selectedRegion !== "" &&
      this.selectedSubnet !== "" &&
      this.selectedEip !== ""
    );
  }

  get subnetsOptions(): string[] {
    const options: string[] = [];
    this.subnets.forEach((s) => {
      let option = "";
      if (s.SubnetId) option += s.SubnetId;
      const name = this.extractNameFromTags(s.Tags || []);
      if (name) option += ` - ${name}`;

      options.push(option);
    });
    return options;
  }

  get eipOptions(): string[] {
    const options: string[] = [];
    this.eips.forEach((e) => {
      //We need only IPs not associated to anything yet
      if (!e.AssociationId) {
        let option = "";
        if (e.PublicIp) option += e.PublicIp;
        const name = this.extractNameFromTags(e.Tags || []);
        if (name) option += ` - ${name}`;

        options.push(option);
      }
    });
    return options;
  }

  regionChanged(): void {
    this.getSubnetsForCurrentRegion();
    this.getEipsForCurrentRegion();
  }

  async getSubnetsForCurrentRegion(): Promise<void> {
    this.hideErrors("createNat");
    if (this.selectedRegion === "") {
      this.subnets = [];
    } else {
      const credentials = await this.credentials();

      if (!credentials) {
        return;
      }

      const EC2 = new EC2Client({
        region: this.selectedRegion,
        credentials,
      });

      this.incrementLoadingCount();

      EC2.describeSubnets({}, (err, data) => {
        this.decreaseLoadingCount();
        if (err) {
          this.showError(err.message, "createNat");
        } else if (data.Subnets) {
          this.subnets = data.Subnets;
        }
      });
    }
  }

  async getEipsForCurrentRegion(): Promise<void> {
    this.hideErrors("createNat");
    if (this.selectedRegion === "") {
      this.eips = [];
    } else {
      const credentials = await this.credentials();

      if (!credentials) {
        return;
      }

      const EC2 = new EC2Client({
        region: this.selectedRegion,
        credentials,
      });

      this.incrementLoadingCount();
      EC2.describeAddresses({}, (err, data) => {
        this.decreaseLoadingCount();
        if (err) {
          this.showError(err.message, "createNat");
        } else if (data.Addresses) {
          this.eips = data.Addresses;
        }
      });
    }
  }

  async createNat(): Promise<void> {
    const credentials = await this.credentials();

    if (!credentials) {
      return;
    }

    const EC2 = new EC2Client({
      region: this.selectedRegion,
      credentials,
    });
    const AllocationId = this.eips.find(
      (eip) => eip.PublicIp === this.selectedEip.split(" ")[0]
    )?.AllocationId;

    if (!AllocationId) {
      this.showError("You haven't selected any valid IP", "createNat");

      return;
    }

    const params: CreateNatGatewayRequest = {
      AllocationId,
      SubnetId: this.selectedSubnet.split(" ")[0],
    };

    if (this.natName) {
      params.TagSpecifications = [
        {
          ResourceType: "natgateway",
          Tags: [{ Key: "Name", Value: this.natName }],
        },
      ];
    }
    EC2.createNatGateway(params, (err, data) => {
      if (err) {
        this.showError(err.message, "createNat");
      } else {
        this.hideErrors("createNat");
        this.showAlert({
          variant: "info",
          text: "Creating Nat Gateway with ID " + data.NatGateway?.NatGatewayId,
          key: "creatingNat",
          resourceId: data.NatGateway?.NatGatewayId,
        });
        this.$router.push("/network/nats");
      }
    });
  }

  async newIp(): Promise<void> {
    const credentials = await this.credentials();

    if (!credentials) {
      return;
    }
    this.allocateLoading = true;
    const EC2 = new EC2Client({
      region: this.selectedRegion,
      credentials,
    });
    EC2.allocateAddress({ Domain: "vpc" }, (err, data) => {
      this.allocateLoading = false;
      if (err) {
        this.showError(err.message, "createNat");
      } else {
        this.getEipsForCurrentRegion();
        if (data.PublicIp) {
          this.selectedEip = data.PublicIp;
        }
      }
    });
  }

  mounted() {
    this.$root.$on("refresh", this.regionChanged);
  }

  beforeDestroy() {
    this.$root.$off("refresh");
  }

  @Watch("currentRoleIndex")
  onCurrentRoleIndexChanged() {
    this.regionChanged();
  }
}
</script>
