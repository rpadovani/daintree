<template>
  <div class="container mt-2">
    <h2>Create a new Internet Gateway</h2>
    <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
      An internet gateway is a virtual router that connects a VPC to the
      internet. To create a new internet gateway specify the name for the
      gateway below.
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
      v-model="igwName"
      placeholder="Create a tag with key 'Name' and the value you insert."
    >
      <template #prepend>
        <b-input-group-text>Name</b-input-group-text>
      </template>
    </gl-form-input-group>

    <gl-form-group
      id="vpc-id"
      label="Vpc"
      label-size="sm"
      description="Optionally, select a VPC to which attach your new Internet Gateway. Only VPCs without already a Internet Gateway attached are shown."
      label-for="vpc-input"
      class="mt-2"
    >
      <gl-form-select
        id="vpc-input"
        :disabled="selectedRegion === '' || isLoading"
        v-model="selectedVpc"
        :options="vpcsOptions"
      />
    </gl-form-group>

    <div class="row justify-content-between mt-3">
      <gl-button category="secondary" variant="danger" to="/network/igws">
        Cancel
      </gl-button>
      <gl-button
        :disabled="!canClick"
        category="primary"
        variant="success"
        @click="createIgw"
        >Create
      </gl-button>
    </div>
  </div>
</template>

<script lang="ts">
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
import { CreateInternetGatewayRequest, VpcList } from "aws-sdk/clients/ec2";
import { mixins } from "vue-class-component";
import { Formatters } from "@/mixins/formatters";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";

@Component({
  components: {
    GlFormSelect,
    GlFormGroup,
    GlAlert,
    GlFormInputGroup,
    BInputGroupText,
    GlButton,
  },
})
export default class NewIgw extends mixins(DaintreeComponent, Formatters) {
  selectedRegion = "";
  selectedVpc = "";
  igwName = "";
  vpcs: VpcList = [];
  loadingCount = 0;
  vpcsWithGateway: string[] = [];

  get canClick() {
    return this.selectedRegion !== "";
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

  regionChanged() {
    this.getVpcsForCurrentRegion();
  }

  async getVpcsForCurrentRegion(): Promise<void> {
    this.hideErrors("createIgw");
    if (this.selectedRegion === "") {
      this.vpcs = [];
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
      EC2.describeVpcs(
        { Filters: [{ Name: "state", Values: ["available"] }] },
        (err, data) => {
          this.decreaseLoadingCount();
          if (err) {
            this.showError(err.message, "createIgw");
          } else if (data.Vpcs) {
            this.vpcs = data.Vpcs;
          }
        }
      );

      //We need to see which VPCs aren't attached to any internet gateway, so we download them all.
      //We do it in parallel and then leave to VUE doing the difference between the two lists
      this.incrementLoadingCount();
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
          this.decreaseLoadingCount();
          if (err) {
            this.showError(err.message, "createIgw");
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

  async createIgw(): Promise<void> {
    const credentials = await this.credentials();

    if (!credentials) {
      return;
    }

    const EC2 = new EC2Client({
      region: this.selectedRegion,
      credentials,
    });

    const params: CreateInternetGatewayRequest = {};

    this.incrementLoadingCount();
    EC2.createInternetGateway(params, (err, data) => {
      this.decreaseLoadingCount();

      if (err) {
        this.showError(err.message, "createIgw");
      } else {
        this.hideErrors("createIgw");
        this.showAlert({
          variant: "success",
          text:
            "Created Internet Gateway with ID " +
            data.InternetGateway?.InternetGatewayId,
          key: "creatingIgw",
          resourceId: data.InternetGateway?.InternetGatewayId,
        });

        //Assign a name, if available
        if (this.igwName && data.InternetGateway?.InternetGatewayId) {
          const params = {
            Resources: [data.InternetGateway.InternetGatewayId],
            Tags: [{ Key: "Name", Value: this.igwName }],
          };
          this.incrementLoadingCount();
          EC2.createTags(params, (err) => {
            this.decreaseLoadingCount();
            if (err) {
              this.$store.commit("notifications/show", {
                variant: "danger",
                text: err,
                key: "creatingIgw",
              });
            }

            if (!this.isLoading) {
              this.$router.push("/network/igws");
            }
          });
        }

        if (this.selectedVpc && data.InternetGateway?.InternetGatewayId) {
          this.incrementLoadingCount();
          EC2.attachInternetGateway(
            {
              InternetGatewayId: data.InternetGateway.InternetGatewayId,
              VpcId: this.selectedVpc.split(" ")[0],
            },
            (err) => {
              this.decreaseLoadingCount();
              if (err) {
                this.$store.commit("notifications/show", {
                  variant: "danger",
                  text: err,
                  key: "creatingIgw",
                });
              }

              if (!this.isLoading) {
                this.$router.push("/network/igws");
              }
            }
          );
        }

        if (!this.isLoading) {
          this.$router.push("/network/igws");
        }
      }
    });
  }

  get currentRoleIndex(): number {
    return this.$store.getters["sts/currentRoleIndex"];
  }

  @Watch("currentRoleIndex")
  onCurrentRoleIndexChanged() {
    this.regionChanged();
  }

  mounted() {
    this.$root.$on("refresh", this.regionChanged);
  }

  beforeDestroy() {
    this.$root.$off("refresh");
  }
}
</script>
