<template>
  <div class="container mt-2">
    <h2>Create a new VPC peering connection</h2>
    <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
      A VPC peering connection is a networking connection between two VPCs that
      enables you to route traffic between them using private IPv4 addresses or
      IPv6 addresses. Instances in either VPC can communicate with each other as
      if they are within the same network. You can create a VPC peering
      connection between your own VPCs, or with a VPC in another AWS account.
      The VPCs can be in different regions (also known as an inter-region VPC
      peering connection).
    </gl-alert>

    <gl-form @submit="createPeering">
      <gl-form-input-group
        class="mt-3"
        v-model="form.name"
        placeholder="Create a tag with key 'Name' and the value you insert."
      >
        <template #prepend>
          <b-input-group-text>Name</b-input-group-text>
        </template>
      </gl-form-input-group>

      <h5 class="mt-2">Local VPC to peer with</h5>
      <gl-form-group
        id="region-id"
        label="Requester region:"
        label-size="sm"
        description="To see other regions, enable them in the settings"
        label-for="region-input"
      >
        <gl-form-select
          id="region-input"
          v-model="form.requesterRegion"
          :options="this.$store.getters['sts/regions']"
          @change="getVPCsForRequesterRegion"
        />
      </gl-form-group>

      <gl-form-group
        id="vpc-id"
        label="Requester VPC:"
        label-size="sm"
        label-for="vpc-input"
        class="mt-2"
      >
        <gl-form-select
          id="vpc-input"
          :disabled="form.requesterRegion === '' || isLoading"
          v-model="form.requesterVpc"
          :options="requesterVPCs"
          value-field="VpcId"
          text-field="VpcId"
        />
      </gl-form-group>

      <h5 class="mt-2">Peer VPC options</h5>
      <gl-form-input-group
        id="accepter-account-id"
        class="mt-2"
        :predefined-options="accountIdPredefinedOptions"
        v-model="form.accepterAccount"
      />

      <gl-form-group
        id="accepter-region"
        label="Accepter Region:"
        label-size="sm"
        label-for="accepter-region-input"
        class="mt-2"
      >
        <gl-form-select
          id="accepter-region-input"
          v-model="form.accepterRegion"
          :options="allRegions"
          value-field="value"
          text-field="text"
          @change="getVPCsForAccepterRegion"
        />
      </gl-form-group>

      <gl-form-group
        id="accepter-vpc-id"
        label="Accepter VPC:"
        label-size="sm"
        label-for="vpc-input"
        class="mt-2"
        v-if="accountId === form.accepterAccount"
      >
        <gl-form-select
          id="accepter-vpc-input"
          :disabled="form.accepterRegion === '' || isLoading"
          v-model="form.accepterVpc"
          :options="accepterVPCs"
          value-field="VpcId"
          text-field="VpcId"
        />
      </gl-form-group>

      <gl-form-input-group
        class="mt-3"
        v-model="form.accepterVpc"
        v-if="accountId !== form.accepterAccount"
      >
        <template #prepend>
          <b-input-group-text>Accepter VPC ID</b-input-group-text>
        </template>
      </gl-form-input-group>

      <div class="row justify-content-between mt-3">
        <gl-button category="secondary" variant="danger" to="/network/peerings">
          Cancel
        </gl-button>
        <gl-button
          class="float-right"
          type="submit"
          category="primary"
          variant="success"
          :disabled="createButtonDisabled"
          >Create new peering connection
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
} from "@gitlab/ui";
import { BInputGroupText } from "bootstrap-vue";
import EC2Client, {
  CreateVpcPeeringConnectionRequest,
  VpcList,
} from "aws-sdk/clients/ec2";
import { Component } from "vue-property-decorator";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import { ALL_REGIONS } from "@/components/common/regions";

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
export default class NewPeering extends DaintreeComponent {
  readonly allRegions = ALL_REGIONS;
  loadingCount = 0;

  requesterVPCs: VpcList = [];
  accepterVPCs: VpcList = [];

  form = {
    requesterRegion: "",
    requesterVpc: "",
    accepterAccount: "",
    accepterRegion: "",
    accepterVpc: "",
    name: "",
  };

  get accountIdPredefinedOptions(): { name: string; value: string }[] {
    return [
      {
        name: "This account",
        value: this.accountId || "",
      },
      {
        name: "Another account",
        value: "",
      },
    ];
  }

  get createButtonDisabled(): boolean {
    return Object.values(this.form).findIndex((value) => value === "") !== -1;
  }

  async EC2(region: string): Promise<EC2Client | undefined> {
    const credentials = await this.credentials();

    if (!credentials) {
      return;
    }

    return new EC2Client({ region, credentials });
  }

  refresh(): void {
    this.getVPCsForRequesterRegion();
  }

  async getVPCsForRequesterRegion(): Promise<void> {
    this.hideErrors("createPeeringConnection");
    if (this.form.requesterRegion === "") {
      this.requesterVPCs = [];
    } else {
      const EC2 = await this.EC2(this.form.requesterRegion);
      if (!EC2) {
        return;
      }

      this.incrementLoadingCount();
      try {
        const data = await EC2.describeVpcs().promise();
        if (data.Vpcs) {
          this.requesterVPCs = data.Vpcs;
        }
      } catch (err) {
        this.showError(err.message, "createPeeringConnection");
      } finally {
        this.decreaseLoadingCount();
      }
    }
  }

  async getVPCsForAccepterRegion(): Promise<void> {
    this.hideErrors("createPeeringConnection");
    if (
      this.form.accepterRegion === "" ||
      this.accountId !== this.form.accepterAccount
    ) {
      this.accepterVPCs = [];
    } else {
      const EC2 = await this.EC2(this.form.accepterRegion);
      if (!EC2) {
        return;
      }

      this.incrementLoadingCount();
      try {
        const data = await EC2.describeVpcs().promise();
        if (data.Vpcs) {
          this.accepterVPCs = data.Vpcs;
        }
      } catch (err) {
        this.showError(err.message, "createPeeringConnection");
      } finally {
        this.decreaseLoadingCount();
      }
    }
  }

  async createPeering(): Promise<void> {
    const EC2 = await this.EC2(this.form.requesterRegion);
    if (!EC2) {
      return;
    }

    const params: CreateVpcPeeringConnectionRequest = {
      VpcId: this.form.requesterVpc,
      PeerOwnerId: this.form.accepterAccount,
      PeerRegion: this.form.accepterRegion,
      PeerVpcId: this.form.accepterVpc,
    };

    try {
      const data = await EC2.createVpcPeeringConnection(params).promise();
      if (this.form.name && data.VpcPeeringConnection?.VpcPeeringConnectionId) {
        const params = {
          Resources: [data.VpcPeeringConnection.VpcPeeringConnectionId],
          Tags: [{ Key: "Name", Value: this.form.name }],
        };
        await EC2.createTags(params).promise();
      }
      this.hideErrors("createPeeringConnection");
      this.$router.push("/network/peeringConnections");
    } catch (err) {
      this.showError(err.message, "createPeeringConnection");
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
