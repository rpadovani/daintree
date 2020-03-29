<template>
  <div v-if="nat">
    <gl-modal
      modal-id="delete-nat-modal"
      title="Delete NAT gateway"
      no-fade
      :action-primary="deleteNatButtonProps"
      :action-cancel="cancelProps"
      @primary="deleteNat"
    >
      Are you sure that you want to delete this NAT gateway?
    </gl-modal>
    <div class="row justify-content-between">
      <gl-alert :variant="alertVariant" :dismissible="false" class="col-9">
        <b>{{ nat.State }}</b>
      </gl-alert>
      <gl-button
        style="height: 100%"
        class="mt-2 col-2"
        variant="danger"
        category="secondary"
        :disabled="nat.State !== 'available'"
        v-gl-modal-directive="'delete-nat-modal'"
        >Delete this NAT Gateway</gl-button
      >
    </div>
    <div class="row justify-content-around mt-3">
      <gl-card class="col-3" title="VPC ID">
        <router-link :to="`/network/vpcs?vpcId=${nat.VpcId}`">
          {{ nat.VpcId }}
        </router-link>
      </gl-card>

      <gl-card class="col-3" title="Subnet ID">
        <router-link :to="`/network/subnets?subnetId=${nat.SubnetId}`">
          {{ nat.SubnetId }}
        </router-link>
      </gl-card>

      <gl-card class="col-3" title="Create time">
        {{ nat.CreateTime | standardDate }}
      </gl-card>
    </div>
    <div class="row mt-2 justify-content-around">
      <gl-card class="col-3" title="Public IP">
        <router-link
          :to="
            `/network/eips?allocationId=${nat.NatGatewayAddresses[0].AllocationId}`
          "
        >
          {{ nat.NatGatewayAddresses[0].PublicIp }}
        </router-link>
      </gl-card>

      <gl-card class="col-3" title="Private Ip">
        <router-link
          :to="
            `/network/eips?allocationId=${nat.NatGatewayAddresses[0].AllocationId}`
          "
        >
          {{ nat.NatGatewayAddresses[0].PrivateIp }}
        </router-link>
      </gl-card>

      <gl-card class="col-3" title="Network Interface ID">
        <router-link
          :to="
            `/network/interfaces?interfaceId=${nat.NatGatewayAddresses[0].NetworkInterfaceId}`
          "
        >
          {{ nat.NatGatewayAddresses[0].NetworkInterfaceId }}
        </router-link>
      </gl-card>
    </div>
    <h5 class="mt-3">Tags</h5>
    <TagsTable
      :key="nat.NatGatewayId"
      :tags="nat.Tags"
      :region="nat.region"
      :resource-id="nat.NatGatewayId"
    />
  </div>
</template>

<script lang="ts">
import {
  GlTable,
  GlCard,
  GlAlert,
  GlButton,
  GlModal,
  GlModalDirective
} from "@gitlab/ui";
import { Formatters } from "@/mixins/formatters";
import { Prop, Component } from "vue-property-decorator";
import { nats } from "@/components/network/NAT/nat";
import NatWithRegion = nats.NatWithRegion;
import TagsTable from "@/components/common/TagsTable.vue";
import AWS from "aws-sdk";
import { mixins } from "vue-class-component";
import Notifications from "@/mixins/notifications";

@Component({
  components: {
    TagsTable,
    GlTable,
    GlCard,
    GlAlert,
    GlButton,
    GlModal
  },
  directives: { "gl-modal-directive": GlModalDirective }
})
export default class Nat extends mixins(Formatters, Notifications) {
  @Prop(Object) readonly nat!: NatWithRegion;

  deleteNatButtonProps = {
    text: "Delete NAT Gateway"
  };

  cancelProps = {
    text: "Cancel"
  };

  get alertVariant() {
    switch (this.nat.State) {
      case "available":
        return "success";
      case "pending":
      case "deleting":
        return "info";
      case "failed":
        return "danger";
      case "deleted":
        return "tip";
    }

    return "info";
  }

  deleteNat() {
    if (!this.nat.NatGatewayId) {
      return;
    }

    const EC2 = new AWS.EC2({ region: this.nat.region });
    EC2.deleteNatGateway(
      { NatGatewayId: this.nat.NatGatewayId },
      (err, data) => {
        if (err) {
          this.showError(err.message, "deleteNat");
        } else {
          this.hideErrors("deleteNat");
          this.showAlert({
            variant: "info",
            text: "Deleting Nat Gateway with ID " + data.NatGatewayId,
            key: "deletingNat",
            resourceId: data.NatGatewayId
          });
          this.$emit("deleted");
        }
      }
    );
  }
}
</script>

<style scoped></style>
