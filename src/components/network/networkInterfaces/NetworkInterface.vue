<template>
  <gl-tabs theme="blue" lazy>
    <gl-tab title="Overview">
      <gl-modal
        modal-id="delete-network-interface-modal"
        title="Delete network interface"
        no-fade
        :action-primary="deleteNetworkInterfaceButtonProps"
        :action-cancel="cancelProps"
        @primary="deleteNetworkInterface"
      >
        Are you sure that you want to delete this network interface ({{
          networkInterface.NetworkInterfaceId
        }})?
      </gl-modal>
      <div class="row justify-content-between">
        <gl-alert :variant="alertVariant" :dismissible="false" class="col-9">
          Network interface's state: <b>{{ networkInterface.Status }}</b>
        </gl-alert>

        <gl-button
          style="height: 100%;"
          class="mt-2 col-2"
          variant="danger"
          category="secondary"
          :disabled="networkInterface.Status !== 'available'"
          v-gl-modal-directive="'delete-network-interface-modal'"
          >Delete this interface</gl-button
        >
      </div>

      <DrawerCards :cards="cards" />

      <h5>Tags</h5>
      <TagsTable
        :tags="networkInterface.TagSet"
        :region="networkInterface.region"
        :resource-id="networkInterface.NetworkInterfaceId"
      />
    </gl-tab>

    <gl-tab title="Association" v-if="networkInterface.Association">
      <DrawerCards :cards="associationCards" />
    </gl-tab>

    <gl-tab title="Attachment" v-if="networkInterface.Attachment">
      <DrawerCards :cards="attachmentCards" />
    </gl-tab>

    <gl-tab title="Security groups">
      <RelatedSecurityGroups
        :region="networkInterface.region"
        filter-name="group-id"
        :filter-values="securityGroupIds"
      />
    </gl-tab>
  </gl-tabs>
</template>

<script lang="ts">
import {
  GlAlert,
  GlButton,
  GlCard,
  GlEmptyState,
  GlModal,
  GlModalDirective,
  GlSkeletonLoading,
  GlTab,
  GlTable,
  GlTabs,
  GlIcon,
} from "@gitlab/ui";
import EC2Client, {
  NetworkInterface as AWSNetworkInterface,
} from "aws-sdk/clients/ec2";
import { Component, Prop } from "vue-property-decorator";
import TagsTable from "@/components/common/TagsTable.vue";
import RelatedRoutesTable from "@/components/network/routeTables/RelatedRoutesTable.vue";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import DrawerCards from "@/components/common/DrawerCards.vue";
import { CardContent } from "@/components/common/cardContent";
import { AlertVariant } from "@/store/notifications/state";
import { Metadata } from "@/mixins/DaintreeListComponent";
import { isString } from "@/utils/isString";
import SubnetTab from "@/components/network/subnets/SubnetTab.vue";
import RelatedSecurityGroups from "@/components/network/securityGroups/RelatedSecurityGroups.vue";

@Component({
  components: {
    RelatedSecurityGroups,
    SubnetTab,
    DrawerCards,
    RelatedRoutesTable,
    TagsTable,
    GlTabs,
    GlTab,
    GlTable,
    GlEmptyState,
    GlSkeletonLoading,
    GlCard,
    GlAlert,
    GlButton,
    GlModal,
    GlIcon,
  },
  directives: { "gl-modal-directive": GlModalDirective },
})
export default class NetworkInterface extends DaintreeComponent {
  @Prop(Object) readonly networkInterface!: AWSNetworkInterface & Metadata;

  get cards(): CardContent[] {
    return [
      {
        title: "Private DNS name",
        value: this.networkInterface.PrivateDnsName,
        helpText: "The private DNS name.",
      },
      {
        title: "Private IPv4 address",
        value: this.networkInterface.PrivateIpAddress,
        helpText:
          "The IPv4 address of the network interface within the subnet.",
      },
      {
        title: "Description",
        value: this.networkInterface.Description,
      },
      {
        title: "Network interface type",
        value: this.networkInterface.InterfaceType,
        helpText:
          "The type of network interface. Can be interface, nat gateway, or efa.",
      },
      {
        title: "VPC ID",
        value: this.networkInterface.VpcId,
        linkTo: `/network/vpcs?vpcId=${this.networkInterface.VpcId}`,
        helpText:
          "The ID of the VPC to which the networkInterface is associated.",
      },
      {
        title: "Subnet ID",
        linkTo: `/network/subnets?subnetId=${this.networkInterface.SubnetId}`,
        value: this.networkInterface.SubnetId,
        helpText: "The ID of the subnet in which the instance is running.",
      },
      {
        title: "MAC address",
        value: this.networkInterface.MacAddress,
      },
      {
        title: "Outpost ARN",
        value: this.networkInterface.OutpostArn,
        helpText: "The Amazon Resource Name (ARN) of the Outpost.",
      },
      {
        title: "Availability zone",
        value: this.networkInterface.AvailabilityZone,
        isAz: true,
      },
      { title: "Owner ID", value: this.networkInterface.OwnerId },
      {
        title: "Requester ID",
        value: this.networkInterface.RequesterId,
        helpText:
          "The ID of the entity that launched the instance on your behalf (for example, AWS Management Console or Auto Scaling).",
      },
      {
        title: "Requester managed?",
        value: this.networkInterface.RequesterManaged,
        helpText:
          "Indicates whether the network interface is being managed by AWS.",
      },
      {
        title: "Is traffic validated?",
        value: this.networkInterface.SourceDestCheck,
        helpText:
          "Indicates whether traffic to or from the instance is validated.",
      },
    ];
  }

  get associationCards(): CardContent[] {
    return [
      {
        title: "Public DNS name",
        value: this.networkInterface.Association?.PublicDnsName,
        helpText: "The public DNS name.",
      },
      {
        title: "Public IP",
        value: this.networkInterface.Association?.PublicIp,
        helpText:
          "The address of the Elastic IP address bound to the network interface.",
      },
      {
        title: "Allocation ID",
        value: this.networkInterface.Association?.AllocationId,
        helpText: "The allocation ID.",
      },
      {
        title: "Association ID",
        value: this.networkInterface.Association?.AssociationId,
        helpText: "The association ID.",
      },
      {
        title: "IP address owner ID",
        value: this.networkInterface.Association?.IpOwnerId,
        helpText: "The ID of the Elastic IP address owner.",
      },
    ];
  }

  get attachmentCards(): CardContent[] {
    return [
      {
        title: "Attach time",
        value: this.networkInterface.Attachment?.AttachTime,
        helpText: "The timestamp indicating when the attachment initiated.",
      },
      {
        title: "Delete on termination?",
        value: this.networkInterface.Attachment?.DeleteOnTermination,
        helpText:
          "Indicates whether the network interface is deleted when the instance is terminated.",
      },
      {
        title: "Device index",
        value: this.networkInterface.Attachment?.DeviceIndex,
        helpText:
          "The device index of the network interface attachment on the instance.",
      },
      {
        title: "Status",
        value: this.networkInterface.Attachment?.Status,
        helpText: "The attachment state.",
        isState: true,
      },
      {
        title: "Instance ID",
        value: this.networkInterface.Attachment?.InstanceId,
        helpText: "The ID of the instance.",
        linkTo: `/ec2/instances?instanceId=${this.networkInterface.Attachment?.InstanceId}`,
      },
      {
        title: "Attachment ID",
        value: this.networkInterface.Attachment?.AttachmentId,
        helpText: "The ID of the network interface attachment.",
      },
      {
        title: "Instance owner ID",
        value: this.networkInterface.Attachment?.InstanceOwnerId,
        helpText: "The AWS account ID of the owner of the instance.",
      },
    ];
  }

  get securityGroupIds(): string[] {
    if (!this.networkInterface.Groups) {
      //If there are no groups, we return a placeholder so the tab does not load all the SGs of the account
      return ["daintree_placeholder"];
    }
    return this.networkInterface.Groups?.map((group) => group.GroupId).filter(
      isString
    );
  }

  deleteNetworkInterfaceButtonProps = {
    text: "Delete networkInterface",
  };

  cancelProps = {
    text: "Cancel",
  };

  get alertVariant(): AlertVariant {
    switch (this.networkInterface.Status) {
      case "associated":
      case "in-use":
        return "success";

      case "attaching":
      case "available":
        return "info";
      case "detaching":
        return "warning";
    }

    return "info";
  }

  async EC2Client(): Promise<EC2Client | void> {
    const credentials = await this.credentials();

    if (credentials === undefined) {
      return;
    }

    return new EC2Client({ region: this.networkInterface.region, credentials });
  }

  async deleteNetworkInterface(): Promise<void> {
    if (!this.networkInterface.NetworkInterfaceId) {
      return;
    }

    const client = await this.EC2Client();

    if (!client) {
      return;
    }

    try {
      await client
        .deleteNetworkInterface({
          NetworkInterfaceId: this.networkInterface.NetworkInterfaceId,
        })
        .promise();

      this.hideErrors("deleteNetworkInterface");
      this.$emit("deleted");
    } catch (err) {
      this.showError(err.message, "deleteNetworkInterface");
    }
  }
}
</script>
