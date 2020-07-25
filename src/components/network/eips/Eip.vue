<template>
  <div v-if="updatedEip">
    <gl-alert
      :variant="alertVariant"
      v-if="alertMessage.length > 0"
      @dismiss="() => (alertMessage = '')"
      class="col-12 mb-2"
    >
      {{ alertMessage }}
    </gl-alert>

    <gl-modal
      modal-id="disassociate-eip-modal"
      title="Disassociate IP"
      no-fade
      :action-primary="disassociateEipButtonProps"
      :action-cancel="cancelProps"
      @primary="disassociateEip"
    >
      Are you sure that you want to disassociate this Elastic IP (<b>{{
        updatedEip.PublicIp
      }}</b
      >)?
    </gl-modal>

    <gl-modal
      modal-id="associate-eip-modal"
      title="Associate IP"
      no-fade
      :action-primary="associateEipButtonProps"
      :action-cancel="cancelProps"
      @primary="associateEip"
      @cancel="
        () => (this.selectedNetworkInterface = this.selectedInstance = '')
      "
    >
      <gl-alert variant="warning" :dismissible="false">
        If you associate an Elastic IP address with your instance, your current
        public IP address is released.
        <a href="https://docs.aws.amazon.com/console/ec2/elastic-ips/public-ip"
          >Learn more in the AWS Guide<gl-icon name="external-link" /></a
        >.</gl-alert
      >
      Select the instance or the network interface to which you want to
      associate this Elastic IP (<b>{{ updatedEip.PublicIp }}</b
      >).
      <gl-form-group
        id="instance-id"
        label="Instance"
        label-size="sm"
        label-for="instance-input"
      >
        <gl-form-select
          id="instance-input"
          v-model="selectedInstance"
          :options="instances"
          @change="instanceChanged"
        />
      </gl-form-group>

      <gl-form-group
        id="network-id"
        label="Network interface"
        label-size="sm"
        label-for="network-input"
      >
        <gl-form-select
          id="network-input"
          @change="networkInterfacesChanged"
          v-model="selectedNetworkInterface"
          :options="networkInterfaces"
        />
      </gl-form-group>
    </gl-modal>

    <gl-modal
      modal-id="release-eip-modal"
      title="Release IP"
      no-fade
      :action-primary="releaseEipButtonProps"
      :action-cancel="cancelProps"
      @primary="releaseEip"
    >
      Are you sure that you want to release this Elastic IP (<b>{{
        updatedEip.PublicIp
      }}</b
      >)?
    </gl-modal>
    <div class="row justify-content-center">
      <gl-button-group>
        <gl-button
          variant="success"
          category="secondary"
          :disabled="!!updatedEip.AssociationId"
          v-gl-modal-directive="'associate-eip-modal'"
          >Associate
        </gl-button>
        <gl-button
          variant="warning"
          category="secondary"
          :disabled="!updatedEip.AssociationId"
          v-gl-modal-directive="'disassociate-eip-modal'"
          >Disassociate
        </gl-button>
        <gl-button
          variant="danger"
          category="secondary"
          :disabled="!!updatedEip.AssociationId"
          v-gl-modal-directive="'release-eip-modal'"
          >Release
        </gl-button>
      </gl-button-group>
    </div>

    <DrawerCards :cards="cards" />

    <h5 class="mt-3">Tags</h5>
    <TagsTable
      :tags="updatedEip.Tags"
      :region="updatedEip.region"
      :resource-id="updatedEip.AllocationId"
    />
  </div>
</template>

<script lang="ts">
import {
  GlAlert,
  GlButton,
  GlButtonGroup,
  GlCard,
  GlFormGroup,
  GlFormSelect,
  GlIcon,
  GlModal,
  GlModalDirective,
  GlTable,
} from "@gitlab/ui";
import { Formatters } from "@/mixins/formatters";
import { Component, Prop, Watch } from "vue-property-decorator";
import TagsTable from "@/components/common/TagsTable.vue";
import EC2Client, {
  AssociateAddressRequest,
  DisassociateAddressRequest,
} from "aws-sdk/clients/ec2";
import { mixins } from "vue-class-component";
import { eips } from "@/components/network/eips/eip";
import { CardContent } from "@/components/common/cardContent";
import DrawerCards from "@/components/common/DrawerCards.vue";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import EipWithRegion = eips.EipWithRegion;

@Component({
  components: {
    TagsTable,
    GlTable,
    GlCard,
    GlAlert,
    GlButton,
    GlModal,
    GlButtonGroup,
    GlFormGroup,
    GlFormSelect,
    GlIcon,
    DrawerCards,
  },
  directives: { "gl-modal-directive": GlModalDirective },
})
export default class Eip extends mixins(Formatters, DaintreeComponent) {
  @Prop(Object) readonly eip!: EipWithRegion;

  //EIP downloaded from the APIs
  private freshEip: EipWithRegion = {};

  alertMessage = "";
  alertVariant = "";

  instances: string[] = [];
  selectedInstance = "";
  networkInterfaces: string[] = [];
  selectedNetworkInterface = "";

  disassociateEipButtonProps = {
    text: "Disassociate IP",
  };

  releaseEipButtonProps = {
    text: "Release IP",
    attributes: [{ variant: "danger" }],
  };

  cancelProps = {
    text: "Cancel",
  };

  get updatedEip(): EipWithRegion {
    if (this.eip.AllocationId !== this.freshEip.AllocationId) {
      return this.eip;
    }

    return this.freshEip;
  }

  get cards(): CardContent[] {
    return [
      {
        title: "Public IP",
        value: this.updatedEip.PublicIp,
        helpText: "The Elastic IP address",
      },
      {
        title: "Private IP",
        value: this.updatedEip.PrivateIpAddress,
        helpText:
          "The private IP address associated with the Elastic IP address.",
      },
      {
        title: "Network Interface ID",
        value: this.updatedEip.NetworkInterfaceId,
        helpText: "The ID of the network interface.",
        linkTo: `/network/interfaces?interfaceId=${this.updatedEip.NetworkInterfaceId}`,
      },
      {
        title: "Instance ID",
        linkTo: `/network/eips?allocationId=${this.eip.InstanceId}`,
        helpText:
          "The ID of the instance that the address is associated with (if any).",
        value: this.updatedEip.InstanceId,
      },

      {
        title: "Association ID",
        value: this.updatedEip.AssociationId,
        helpText:
          "The ID representing the association of the address with an instance in a VPC.",
      },
      {
        title: "Scope",
        value: this.updatedEip.Domain,
        helpText:
          "Indicates whether this Elastic IP address is for use with instances in EC2-Classic (standard) or instances in a VPC (vpc).",
      },
    ];
  }

  get associateEipButtonProps() {
    return {
      text: "Associate IP",
      attributes: [
        {
          disabled:
            this.selectedInstance === "" &&
            this.selectedNetworkInterface === "",
        },
        {
          variant: "success",
        },
      ],
    };
  }

  networkInterfacesChanged(): void {
    if (this.selectedNetworkInterface !== "" && this.selectedInstance !== "") {
      this.selectedInstance = "";
    }
  }

  instanceChanged(): void {
    if (this.selectedNetworkInterface !== "" && this.selectedInstance !== "") {
      this.selectedNetworkInterface = "";
    }
  }

  async EC2(): Promise<EC2Client | undefined> {
    const credentials = await this.credentials();
    if (!credentials) {
      return;
    }

    return new EC2Client({
      region: this.eip.region,
      credentials,
    });
  }

  async disassociateEip(): Promise<void> {
    const params: DisassociateAddressRequest = {};
    if (this.updatedEip.AssociationId) {
      params.AssociationId = this.updatedEip.AssociationId;
    } else {
      params.PublicIp = this.updatedEip.PublicIp;
    }

    const client = await this.EC2();
    if (!client) {
      return;
    }

    try {
      await client.disassociateAddress(params).promise();
      this.alertMessage = "Elastic ip successfully disassociated";
      this.alertVariant = "success";
      this.refresh();
    } catch (err) {
      this.alertMessage = err;
      this.alertVariant = "danger";
    }
  }

  async releaseEip(): Promise<void> {
    if (!this.updatedEip.AllocationId) {
      return;
    }

    const client = await this.EC2();
    if (!client) {
      return;
    }

    try {
      await client
        .releaseAddress({ AllocationId: this.updatedEip.AllocationId })
        .promise();
      this.showAlert({
        variant: "info",
        text: "Released Elastic IP with ID " + this.updatedEip.AllocationId,
        key: "releasedEip",
        resourceId: this.updatedEip.AllocationId,
      });
      this.$emit("deleted");
    } catch (err) {
      this.alertMessage = err;
      this.alertVariant = "danger";
    }
  }

  async downloadInstances(): Promise<void> {
    const client = await this.EC2();
    if (!client || !this.updatedEip.AllocationId) {
      return;
    }

    try {
      const data = await client.describeInstances().promise();
      data.Reservations?.forEach((r) => {
        r.Instances?.forEach((i) => {
          if (i.InstanceId) {
            this.instances.push(
              `${i.InstanceId} - ${this.extractNameFromTags(i.Tags || [])}`
            );
          }
        });
      });
    } catch (err) {
      this.alertMessage = err.message;
      this.alertVariant = "danger";
    }
  }

  async downloadNetworkInterfaces(): Promise<void> {
    const client = await this.EC2();
    if (!client || !this.updatedEip.AllocationId) {
      return;
    }

    try {
      const data = await client.describeNetworkInterfaces().promise();

      data.NetworkInterfaces?.forEach((n) => {
        if (n.NetworkInterfaceId) {
          this.networkInterfaces.push(
            `${n.NetworkInterfaceId} - ${this.extractNameFromTags(
              n.TagSet || []
            )}`
          );
        }
      });
    } catch (err) {
      this.alertMessage = err.message;
      this.alertVariant = "danger";
    }
  }

  refresh(): void {
    this.networkInterfaces = [];
    this.instances = [];

    this.downloadInstances();
    this.downloadUpdatedData();
    this.downloadNetworkInterfaces();
  }

  mounted(): void {
    this.refresh();
  }

  async associateEip(): Promise<void> {
    const params: AssociateAddressRequest = {
      AllocationId: this.updatedEip.AllocationId,
    };

    if (this.selectedInstance) {
      params.InstanceId = this.selectedInstance.split(" ")[0];
    } else {
      params.NetworkInterfaceId = this.selectedNetworkInterface.split(" ")[0];
    }

    const client = await this.EC2();
    if (!client || !this.updatedEip.AllocationId) {
      return;
    }

    try {
      const data = await client.associateAddress(params).promise();
      this.alertMessage = "Created association with ID " + data.AssociationId;
      this.alertVariant = "success";
      this.refresh();
    } catch (err) {
      this.alertMessage = err.message;
      this.alertVariant = "danger";
    }
  }

  @Watch("eip", { deep: true })
  async downloadUpdatedData(): Promise<void> {
    const client = await this.EC2();

    if (!client || !this.eip.AllocationId) {
      return;
    }

    try {
      const data = await client
        .describeAddresses({
          Filters: [
            {
              Name: "allocation-id",
              Values: [this.eip.AllocationId],
            },
          ],
        })
        .promise();

      if (!data.Addresses) {
        return;
      }

      this.freshEip = {
        ...data.Addresses[0],
        region: this.eip.region,
      };
    } catch (err) {
      this.alertMessage = err.message;
      this.alertVariant = "danger";
    }
  }
}
</script>
