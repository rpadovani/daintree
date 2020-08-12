<template>
  <gl-tabs theme="blue" lazy>
    <gl-tab title="Overview">
      <div class="row justify-content-between">
        <gl-alert :variant="alertVariant" :dismissible="false" class="col-9">
          <b>{{ peering.Status.Message }}</b>
        </gl-alert>

        <DeleteButtonWithConfirmation
          style="height: 100%;"
          class="mt-2 col-3"
          resource-type="peering connection"
          :resource-id="peering.VpcPeeringConnectionId"
          :resource-name="resourceName"
          @primary="deletePeering"
          :disabled="peering.Status.Code !== 'available'"
        />
      </div>

      <DrawerCards :cards="cards" />

      <h5>Tags</h5>
      <TagsTable
        :tags="peering.Tags"
        :region="peering.region"
        :resource-id="peering.VpcPeeringConnectionId"
      />
    </gl-tab>

    <gl-tab title="Route Tables">
      <RelatedRoutesTable
        :region="peering.region"
        filter-key="route.vpc-peering-connection-id"
        :filter-value="peering.VpcPeeringConnectionId"
      />
    </gl-tab>
  </gl-tabs>
</template>

<script lang="ts">
import {
  GlAlert,
  GlCard,
  GlEmptyState,
  GlSkeletonLoading,
  GlTab,
  GlTabs,
} from "@gitlab/ui";
import EC2Client from "aws-sdk/clients/ec2";
import { Component, Prop } from "vue-property-decorator";
import TagsTable from "@/components/common/TagsTable.vue";
import { peerings } from "@/components/network/peering/peering";
import PeeringWithRegion = peerings.PeeringWithRegion;
import RelatedRoutesTable from "@/components/network/routeTables/RelatedRoutesTable.vue";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import DrawerCards from "@/components/common/DrawerCards.vue";
import { CardContent } from "@/components/common/cardContent";
import { AlertVariant } from "@/store/notifications/state";
import DeleteButtonWithConfirmation from "@/components/common/DeleteButtonWithConfirmation.vue";
import { extractNameFromEC2Tags } from "@/components/common/tags";

@Component({
  components: {
    DrawerCards,
    RelatedRoutesTable,
    TagsTable,
    GlTab,
    GlTabs,
    GlEmptyState,
    GlSkeletonLoading,
    GlCard,
    GlAlert,
    DeleteButtonWithConfirmation,
  },
})
export default class Peering extends DaintreeComponent {
  @Prop(Object) readonly peering!: PeeringWithRegion;

  get resourceName(): string | undefined {
    return extractNameFromEC2Tags(this.peering.Tags);
  }

  get cards(): CardContent[] {
    return [
      {
        title: "Requester VPC CIDR",
        value: this.peering.RequesterVpcInfo?.CidrBlock,
        helpText: "The IPv4 CIDR block for the requester's VPC.",
      },
      {
        title: "Requester VPC ID",
        value: this.peering.RequesterVpcInfo?.VpcId,
        linkTo: `/network/vpcs?vpcId=${this.peering.RequesterVpcInfo?.VpcId}`,
        helpText: "The ID of the requester's VPC.",
      },
      {
        title: "Requester Owner ID",
        value: this.peering.RequesterVpcInfo?.OwnerId,
        helpText: "The AWS account ID of the requester's VPC owner",
      },
      {
        title: "Requester region",
        value: this.peering.RequesterVpcInfo?.Region,
        isRegion: true,
        helpText: "The region in which the requester's VPC is located.",
      },
      {
        title: "Accepter VPC CIDR",
        value: this.peering.AccepterVpcInfo?.CidrBlock,
        helpText: "The IPv4 CIDR block for the accepter's VPC.",
      },
      {
        title: "Accepter VPC ID",
        value: this.peering.AccepterVpcInfo?.VpcId,
        linkTo: `/network/vpcs?vpcId=${this.peering.AccepterVpcInfo?.VpcId}`,
        helpText: "The ID of the accepter's VPC.",
      },
      {
        title: "Accepter Owner ID",
        value: this.peering.AccepterVpcInfo?.OwnerId,
        helpText: "The AWS account ID of the accepter's VPC owner",
      },
      {
        title: "Accepter region",
        value: this.peering.AccepterVpcInfo?.Region,
        isRegion: true,
        helpText: "The region in which the accepter's VPC is located.",
      },
      {
        title: "Allow DNS resolution from remote VPC?",
        value: this.peering.AccepterVpcInfo?.PeeringOptions
          ?.AllowDnsResolutionFromRemoteVpc,
        helpText:
          "Indicates whether a local VPC can resolve public DNS hostnames to private IP addresses when queried from instances in a peer VPC.",
      },
    ];
  }

  get alertVariant(): AlertVariant {
    switch (this.peering.Status?.Code) {
      case "initiating-request":
      case "pending-acceptance":
        return "info";

      case "active":
        return "success";
      case "deleted":
      case "failed":
        return "danger";
      case "rejected":
      case "provisioning":
      case "deleting":
        return "warning";
      case "expired":
        return "tip";
    }

    return "info";
  }

  async EC2Client(): Promise<EC2Client | void> {
    const credentials = await this.credentials();

    if (credentials === undefined) {
      return;
    }

    return new EC2Client({ region: this.peering.region, credentials });
  }

  async deletePeering(): Promise<void> {
    if (!this.peering.VpcPeeringConnectionId) {
      return;
    }

    const client = await this.EC2Client();

    if (!client) {
      return;
    }

    try {
      await client
        .deleteVpcPeeringConnection({
          VpcPeeringConnectionId: this.peering.VpcPeeringConnectionId,
        })
        .promise();

      this.hideErrors("deletePeering");
      this.showAlert({
        variant: "info",
        text:
          "Deleted VPC peering connection with ID " +
          this.peering.VpcPeeringConnectionId,
        key: "deletingPeering",
        resourceId: this.peering.VpcPeeringConnectionId,
      });
      this.$emit("deleted");
    } catch (err) {
      this.showError(err.message, "deletePeering");
    }
  }
}
</script>
