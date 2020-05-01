<template>
  <div>
    <Header @refresh="regionChanged" :loading="loadingCount > 0" />
    <div class="container mt-2">
      <h2>Create a new route table</h2>
      <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
        A route table specifies how packets are forwarded between the subnets
        within your VPC, the internet, and your VPN connection.
      </gl-alert>
      <gl-form-group
        id="region-id"
        label="Region"
        label-size="sm"
        description="To see other regions, enable them in the settings"
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
        v-model="routeTableName"
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
        description="Select a VPC to which attach your new Internet Gateway. Only VPCs without already a Internet Gateway attached are shown."
        label-for="vpc-input"
        class="mt-2"
      >
        <gl-form-select
          id="vpc-input"
          :disabled="selectedRegion === '' || loadingCount > 0"
          v-model="selectedVpc"
          :options="vpcsOptions"
        />
      </gl-form-group>

      <div class="row justify-content-between mt-3">
        <gl-button
          category="secondary"
          variant="danger"
          to="/network/routeTables"
        >
          Cancel
        </gl-button>
        <gl-button
          :disabled="!canClick"
          category="primary"
          variant="success"
          @click="createRouteTable"
          >Create route table
        </gl-button>
      </div>
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
  GlButton
} from "@gitlab/ui";
import { BInputGroupText } from "bootstrap-vue";
import EC2Client from "aws-sdk/clients/ec2";
import { Component, Watch } from "vue-property-decorator";
import Notifications from "@/mixins/notifications";
import { VpcList } from "aws-sdk/clients/ec2";
import { Formatters } from "@/mixins/formatters";
import { mixins } from "vue-class-component";

@Component({
  components: {
    Header,
    GlFormSelect,
    GlFormGroup,
    GlAlert,
    GlFormInputGroup,
    BInputGroupText,
    GlButton
  }
})
export default class NewRouteTable extends mixins(Notifications, Formatters) {
  selectedRegion = "";
  selectedVpc = "";

  routeTableName = "";
  vpcs: VpcList = [];
  loadingCount = 0;

  get canClick() {
    return this.selectedRegion !== "" && this.selectedVpc !== "";
  }

  get vpcsOptions(): string[] {
    const options: string[] = [];
    this.vpcs.forEach(s => {
      let option = "";
      if (s.VpcId) option += s.VpcId;
      const name = this.extractNameFromTags(s.Tags || []);
      if (name) option += ` - ${name}`;

      options.push(option);
    });
    return options;
  }

  get credentials() {
    return this.$store.getters["sts/credentials"];
  }

  regionChanged() {
    this.getVpcsForCurrentRegion();
  }

  createRouteTable() {
    const EC2 = new EC2Client({
      region: this.selectedRegion,
      credentials: this.credentials
    });
    EC2.createRouteTable(
      { VpcId: this.selectedVpc.split(" ")[0] },
      (err, data) => {
        if (err) {
          this.showError(err.message, "createRouteTable");
        } else {
          this.hideErrors("createRouteTable");

          //We cannot set tags with `createRouteTable`
          if (
            this.routeTableName &&
            data.RouteTable &&
            data.RouteTable.RouteTableId
          ) {
            const params = {
              Resources: [data.RouteTable.RouteTableId],
              Tags: [{ Key: "Name", Value: this.routeTableName }]
            };
            EC2.createTags(params, err => {
              if (err) {
                this.showError(err.message, "createRouteTable");
              } else {
                this.$router.push(
                  `/network/routeTables?routeTableId=${data.RouteTable?.RouteTableId}`
                );
              }
            });
          } else {
            this.$router.push(
              `/network/routeTables?routeTableId=${data.RouteTable?.RouteTableId}`
            );
          }
        }
      }
    );
  }

  getVpcsForCurrentRegion() {
    this.hideErrors("createRt");
    if (this.selectedRegion === "") {
      this.vpcs = [];
    } else {
      const EC2 = new EC2Client({
        region: this.selectedRegion,
        credentials: this.credentials
      });

      this.loadingCount++;
      EC2.describeVpcs(
        { Filters: [{ Name: "state", Values: ["available"] }] },
        (err, data) => {
          this.loadingCount--;
          if (err) {
            this.showError(err.message, "createRt");
          } else if (data.Vpcs) {
            this.vpcs = data.Vpcs;
          }
        }
      );
    }
  }

  get currentRoleIndex(): number {
    return this.$store.getters["sts/currentRoleIndex"];
  }

  @Watch("currentRoleIndex")
  onCurrentRoleIndexChanged() {
    this.regionChanged();
  }
}
</script>

<style scoped></style>
