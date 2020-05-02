<template>
  <div v-if="eip">
    <gl-alert
      :variant="alertVariant"
      v-if="alertMessage.length > 0"
      class="col-12 mb-2"
    >
      <b>{{ alertMessage }}</b>
    </gl-alert>

    <gl-modal
      modal-id="disassociate-eip-modal"
      title="Disassociate IP"
      no-fade
      :action-primary="disassociateEipButtonProps"
      :action-cancel="cancelProps"
      @primary="disassociateEip"
    >
      Are you sure that you want to disassociate this Elastic IP ({{
        eip.PublicIp
      }})?
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
      associate this Elastic IP (<b>{{ eip.PublicIp }}</b
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
        eip.PublicIp
      }}</b
      >)?
    </gl-modal>
    <div class="row justify-content-center">
      <gl-button-group>
        <gl-button
          variant="success"
          category="secondary"
          :disabled="eip.AssociationId"
          v-gl-modal-directive="'associate-eip-modal'"
          >Associate
        </gl-button>
        <gl-button
          variant="warning"
          category="secondary"
          :disabled="!eip.AssociationId"
          v-gl-modal-directive="'disassociate-eip-modal'"
          >Disassociate
        </gl-button>
        <gl-button
          variant="danger"
          category="secondary"
          :disabled="eip.AssociationId"
          v-gl-modal-directive="'release-eip-modal'"
          >Release
        </gl-button>
      </gl-button-group>
    </div>
    <div class="row justify-content-around mt-3">
      <gl-card class="col-3" title="Public IP">
        {{ eip.PublicIp }}
      </gl-card>

      <gl-card class="col-3" title="Private IP">
        {{ eip.PrivateIpAddress }}
      </gl-card>

      <gl-card class="col-3" title="Network Interface ID">
        {{ eip.NetworkInterfaceId }}
      </gl-card>
    </div>
    <div class="row mt-2 justify-content-around">
      <gl-card class="col-3" title="Instance ID">
        <router-link :to="`/network/eips?allocationId=${eip}`">
          {{ eip.InstanceId }}
        </router-link>
      </gl-card>

      <gl-card class="col-3" title="Association ID">
        {{ eip.AssociationId }}
      </gl-card>

      <gl-card class="col-3" title="Scope">
        {{ eip.Domain }}
      </gl-card>
    </div>
    <h5 class="mt-3">Tags</h5>
    <TagsTable
      :key="eip.AllocationId"
      :tags="eip.Tags"
      :region="eip.region"
      :resource-id="eip.AllocationId"
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
  GlModalDirective,
  GlButtonGroup,
  GlFormGroup,
  GlFormSelect,
  GlIcon,
} from "@gitlab/ui";
import { Formatters } from "@/mixins/formatters";
import { Prop, Component } from "vue-property-decorator";
import TagsTable from "@/components/common/TagsTable.vue";
import EC2Client from "aws-sdk/clients/ec2";
import { mixins } from "vue-class-component";
import Notifications from "@/mixins/notifications";
import { eips } from "@/components/network/eips/eip";
import EipWithRegion = eips.EipWithRegion;
import {
  AssociateAddressRequest,
  DisassociateAddressRequest,
} from "aws-sdk/clients/ec2";

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
  },
  directives: { "gl-modal-directive": GlModalDirective },
})
export default class Eip extends mixins(Formatters, Notifications) {
  @Prop(Object) readonly eip!: EipWithRegion;

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

  networkInterfacesChanged() {
    if (this.selectedNetworkInterface !== "" && this.selectedInstance !== "") {
      this.selectedInstance = "";
    }
  }

  instanceChanged() {
    if (this.selectedNetworkInterface !== "" && this.selectedInstance !== "") {
      this.selectedNetworkInterface = "";
    }
  }

  get EC2() {
    return new EC2Client({
      region: this.eip.region,
      credentials: this.$store.getters["sts/credentials"],
    });
  }

  disassociateEip() {
    const params: DisassociateAddressRequest = {};
    if (this.eip.AssociationId) {
      params.AssociationId = this.eip.AssociationId;
    } else {
      params.PublicIp = this.eip.PublicIp;
    }

    this.EC2.disassociateAddress(params, (err) => {
      if (err) {
        this.showError(err.message, "disassociateEip");
      } else {
        this.hideErrors("disassociateEip");
        this.$emit("disassociated");
      }
    });
    return;
  }

  releaseEip() {
    if (!this.eip.AllocationId) {
      return;
    }

    this.EC2.releaseAddress({ AllocationId: this.eip.AllocationId }, (err) => {
      if (err) {
        this.showError(err.message, "releaseEip");
      } else {
        this.hideErrors("releaseEip");
        this.showAlert({
          variant: "info",
          text: "Released Elastic IP with ID " + this.eip.AllocationId,
          key: "releasedEip",
          resourceId: this.eip.AllocationId,
        });
        this.$emit("deleted");
      }
    });
  }

  mounted() {
    this.networkInterfaces = [];
    this.instances = [];

    this.EC2.describeInstances({}, (err, data) => {
      if (err) {
        this.alertMessage = err.message;
        this.alertVariant = "danger";
      } else if (data.Reservations) {
        data.Reservations.forEach((r) => {
          if (r.Instances) {
            r.Instances?.forEach((i) => {
              if (i.InstanceId) {
                this.instances.push(
                  `${i.InstanceId} - ${this.extractNameFromTags(i.Tags || [])}`
                );
              }
            });
          }
        });
      }
    });

    this.EC2.describeNetworkInterfaces({}, (err, data) => {
      if (err) {
        this.alertMessage = err.message;
        this.alertVariant = "danger";
      } else if (data.NetworkInterfaces) {
        data.NetworkInterfaces.forEach((n) => {
          if (n.NetworkInterfaceId) {
            this.networkInterfaces.push(
              `${n.NetworkInterfaceId} - ${this.extractNameFromTags(
                n.TagSet || []
              )}`
            );
          }
        });
      }
    });
  }

  associateEip() {
    const params: AssociateAddressRequest = {
      AllocationId: this.eip.AllocationId,
    };

    if (this.selectedInstance) {
      params.InstanceId = this.selectedInstance.split(" ")[0];
    } else {
      params.NetworkInterfaceId = this.selectedNetworkInterface.split(" ")[0];
    }

    this.EC2.associateAddress(params, (err, data) => {
      if (err) {
        this.alertMessage = err.message;
        this.alertVariant = "danger";
      } else {
        this.alertVariant = "Created association with ID " + data.AssociationId;
        this.alertVariant = "success";
      }
    });
  }
}
</script>

<style scoped></style>
