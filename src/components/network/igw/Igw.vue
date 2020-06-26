<template>
  <div v-if="igw">
    <gl-modal
      modal-id="attach-igw-modal"
      title="Attach internet gateway"
      no-fade
      :action-primary="attachIgwButtonProps"
      :action-cancel="cancelProps"
      @primary="attachIgw"
    >
      <gl-form-group
        id="vpc-id"
        label="Vpc"
        label-size="sm"
        description="Select a VPC to which attach your new Internet Gateway. Only VPCs without already a Internet Gateway attached are shown."
        label-for="vpc-input"
        class="mt-2"
      >
        <gl-form-select
          id="vpc-input"
          v-model="selectedVpc"
          :options="vpcsOptions"
        />
      </gl-form-group>
    </gl-modal>

    <gl-modal
      modal-id="delete-igw-modal"
      title="Delete internet gateway"
      no-fade
      :action-primary="deleteIgwButtonProps"
      :action-cancel="cancelProps"
      @primary="deleteIgw"
    >
      Are you sure that you want to delete this Internet gateway?
    </gl-modal>

    <gl-alert
      class="mb-2"
      v-if="alertMessage.length > 0"
      :variant="alertVariant"
      @dismiss="() => (alertMessage = '')"
    >
      {{ alertMessage }}
    </gl-alert>
    <div class="row justify-content-center">
      <gl-button-group>
        <gl-button
          variant="info"
          category="secondary"
          :disabled="!isDetached"
          v-gl-modal-directive="'attach-igw-modal'"
          >Attach this Internet Gateway
        </gl-button>
        <gl-button category="secondary" :disabled="isDetached" @click="detach"
          >Detach this Internet Gateway
        </gl-button>
        <gl-button
          variant="danger"
          category="secondary"
          :disabled="!isDetached"
          v-gl-modal-directive="'delete-igw-modal'"
          >Delete this Internet Gateway
        </gl-button>
      </gl-button-group>
    </div>

    <DrawerCards :cards="cards" />

    <h5 class="mt-3">Tags</h5>
    <TagsTable
      :key="igw.InternetGatewayId"
      :tags="igw.Tags"
      :region="igw.region"
      :resource-id="igw.InternetGatewayId"
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
} from "@gitlab/ui";
import { Prop, Component } from "vue-property-decorator";
import TagsTable from "@/components/common/TagsTable.vue";
import EC2Client from "aws-sdk/clients/ec2";
import Notifications from "@/mixins/notifications";
import { igws } from "@/components/network/igw/igw";
import IgwWithRegion = igws.IgwWithRegion;
import StateText from "@/components/common/StateText.vue";
import { AlertVariant } from "@/store/notifications/state";
import { mixins } from "vue-class-component";
import { Formatters } from "@/mixins/formatters";
import { VpcList } from "aws-sdk/clients/ec2";
import DrawerCards from "@/components/common/DrawerCards.vue";
import { CardContent } from "@/components/common/cardContent";

@Component({
  components: {
    StateText,
    TagsTable,
    GlTable,
    GlCard,
    GlAlert,
    GlButton,
    GlModal,
    GlButtonGroup,
    GlFormGroup,
    GlFormSelect,
    DrawerCards,
  },
  directives: { "gl-modal-directive": GlModalDirective },
})
export default class Igw extends mixins(Notifications, Formatters) {
  @Prop(Object) readonly igw!: IgwWithRegion;

  alertMessage = "";
  alertVariant: AlertVariant = "info";
  selectedVpc = "";
  vpcsWithGateway: string[] = [];
  vpcs: VpcList = [];

  deleteIgwButtonProps = {
    text: "Delete Internet Gateway",
  };

  cancelProps = {
    text: "Cancel",
  };

  get attachIgwButtonProps() {
    return {
      text: "Attach Internet Gateway",
      attributes: [
        { disabled: this.selectedVpc === "" },
        { variant: "success" },
      ],
    };
  }

  get vpcsOptions(): string[] {
    const options: string[] = [];
    this.vpcs.forEach((s) => {
      if (!this.vpcsWithGateway.includes(s.VpcId || "")) {
        let option = "";
        if (s.VpcId) option += s.VpcId;
        const name = this.extractNameFromTags(s.Tags || []);
        if (name) option += ` - ${name}`;

        options.push(option);
      }
    });
    return options;
  }

  get cards(): CardContent[] {
    return [
      {
        title: "VPC ID",
        linkTo: `/network/vpcs?vpcId=${this.vpcId}`,
        value: this.vpcId,
        helpText:
          "The ID of the VPC to which the Internet Gateway is attached.",
      },
      {
        title: "State",
        value: this.isDetached ? "detached" : "attached",
        helpText: "Is the Internet Gateway attached to any VPC?",
        isState: true,
      },
      {
        title: "Owner Id",
        value: this.igw.OwnerId,
        helpText: "The ID of the AWS account that owns the internet gateway.",
      },
    ];
  }

  get isDetached(): boolean {
    return (
      this.igw.Attachments === undefined || this.igw.Attachments.length <= 0
    );
  }

  get vpcId(): string | undefined {
    if (this.igw.Attachments) {
      return this.igw.Attachments[0].VpcId;
    }

    return "";
  }

  get credentials() {
    return this.$store.getters["sts/credentials"];
  }

  attachIgw() {
    const EC2 = new EC2Client({
      region: this.igw.region,
      credentials: this.credentials,
    });

    if (this.selectedVpc && this.igw.InternetGatewayId) {
      EC2.attachInternetGateway(
        {
          InternetGatewayId: this.igw.InternetGatewayId,
          VpcId: this.selectedVpc.split(" ")[0],
        },
        (err) => {
          if (err) {
            this.alertMessage = err.message;
            this.alertVariant = "danger";
          } else {
            this.alertVariant = "info";
            this.alertMessage = "Internet gateway has been attached";
            this.igw.Attachments = [
              {
                VpcId: this.selectedVpc.split(" ")[0],
                State: "attached",
              },
            ];
          }
        }
      );
    }
  }

  detach() {
    if (
      !this.igw.InternetGatewayId ||
      !this.igw.Attachments ||
      !(this.igw.Attachments.length > 0) ||
      !this.igw.Attachments[0].VpcId
    ) {
      return;
    }

    const EC2 = new EC2Client({
      region: this.igw.region,
      credentials: this.credentials,
    });
    EC2.detachInternetGateway(
      {
        InternetGatewayId: this.igw.InternetGatewayId,
        VpcId: this.igw.Attachments[0].VpcId,
      },
      (err) => {
        if (err) {
          this.alertMessage = err.message;
          this.alertVariant = "danger";
        } else {
          this.alertVariant = "info";
          this.alertMessage = "Internet gateway has been detached";
          this.igw.Attachments = [];
          this.getVpcsForCurrentRegion(); // Reallow to attach after detaching
        }
      }
    );
  }

  deleteIgw() {
    if (!this.igw.InternetGatewayId) {
      return;
    }

    const EC2 = new EC2Client({
      region: this.igw.region,
      credentials: this.credentials,
    });
    EC2.deleteInternetGateway(
      { InternetGatewayId: this.igw.InternetGatewayId },
      (err) => {
        if (err) {
          this.alertMessage = err.message;
          this.alertVariant = "danger";
        } else {
          this.hideErrors("deleteIgw");
          this.dismissAlertByResourceID(this.igw.InternetGatewayId || "");
          this.showAlert({
            variant: "info",
            text:
              "Deleted Internet Gateway with ID " + this.igw.InternetGatewayId,
            key: "deletingIgw",
            resourceId: this.igw.InternetGatewayId,
          });
          this.$emit("deleted");
        }
      }
    );
  }

  beforeMount() {
    this.getVpcsForCurrentRegion();
  }

  getVpcsForCurrentRegion() {
    const EC2 = new EC2Client({
      region: this.igw.region,
      credentials: this.credentials,
    });

    EC2.describeVpcs(
      { Filters: [{ Name: "state", Values: ["available"] }] },
      (err, data) => {
        if (err) {
          this.alertMessage = err.message;
          this.alertVariant = "danger";
        } else if (data.Vpcs) {
          this.vpcs = data.Vpcs;
        }
      }
    );

    //We need to see which VPCs aren't attached to any internet gateway, so we download them all.
    //We do it in parallel and then leave to VUE doing the difference between the two lists
    EC2.describeInternetGateways(
      {
        Filters: [
          {
            Name: "attachment.state",
            Values: ["available"],
          },
        ],
      },
      (err, data) => {
        if (err) {
          this.alertMessage = err.message;
          this.alertVariant = "danger";
        } else if (data.InternetGateways) {
          this.vpcsWithGateway = [];
          data.InternetGateways.forEach((i) => {
            if (i.Attachments && i.Attachments.length > 0) {
              this.vpcsWithGateway.push(i.Attachments[0].VpcId || "");
            }
          });
        }
      }
    );
  }
}
</script>
