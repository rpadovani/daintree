<template>
  <gl-form-group
    id="subnet-id"
    :label="label"
    label-size="sm"
    :description="description"
    label-for="subnet-input"
    class="mt-2"
  >
    <gl-form-select
      id="subnet-input"
      :disabled="isDisabled"
      v-model="subnetValue"
      :options="subnetsOptions"
      @change="changedSubnet"
      required
    />
  </gl-form-group>
</template>

<script lang="ts">
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import { Component, Emit, Model, Prop, Watch } from "vue-property-decorator";

import { GlFormGroup, GlFormSelect } from "@gitlab/ui";
import EC2Client, { SubnetList } from "aws-sdk/clients/ec2";
import { mixins } from "vue-class-component";
import { Formatters } from "@/mixins/formatters";

@Component({
  components: {
    GlFormGroup,
    GlFormSelect,
  },
})
export default class SubnetDropdown extends mixins(
  DaintreeComponent,
  Formatters
) {
  @Model("change", { type: String }) readonly subnet!: boolean;
  @Prop({ default: "Subnet:" }) readonly label!: string;
  @Prop({ default: "" }) readonly region!: string;
  @Prop({ default: "" }) readonly vpcId!: string;
  @Prop({ default: "" }) readonly description!: string;

  private subnetValue = "";
  private subnets: SubnetList = [];

  @Emit("change")
  changedSubnet(): string {
    return this.subnetValue;
  }

  get isDisabled(): boolean {
    return this.region === "" || this.vpcId === "" || this.isLoading;
  }

  get subnetsOptions(): { value: string; text: string }[] {
    const options: { value: string; text: string }[] = [];

    if (this.isLoading) {
      options.push({
        value: "",
        text: "Loading...",
      });
    } else if (this.isDisabled) {
      options.push({
        value: "",
        text: "Select a region and a VPC before selecting a subnet",
      });
    } else {
      options.push({ value: "", text: "Select a subnet" });
    }

    this.subnets.forEach((subnet) => {
      if (subnet.SubnetId) {
        let text = subnet.SubnetId;
        const name = this.extractNameFromTags(subnet.Tags || []);
        if (name) text += ` - ${name}`;

        const cidr = subnet.CidrBlock;
        if (cidr) text += ` (${cidr})`;

        options.push({ value: subnet.SubnetId, text });
      }
    });

    return options;
  }

  @Watch("vpcId")
  @Watch("region", { immediate: true })
  async getSubnetsForCurrentRegion(): Promise<void> {
    this.subnetValue = "";

    this.hideErrors("subnetDropdown");
    if (this.region === "" || this.vpcId === "") {
      this.subnets = [];
      return;
    }

    const credentials = await this.credentials();

    if (!credentials) {
      return;
    }

    const EC2 = new EC2Client({
      region: this.region,
      credentials,
    });

    this.incrementLoadingCount();
    EC2.describeSubnets(
      {
        Filters: [
          { Name: "state", Values: ["available"] },
          { Name: "vpc-id", Values: [this.vpcId] },
        ],
      },
      (err, data) => {
        this.decreaseLoadingCount();
        if (err) {
          this.showError(err.message, "subnetDropdown");
        } else if (data.Subnets) {
          this.subnets = data.Subnets;
        }
      }
    );
  }

  mounted(): void {
    this.$root.$on("refresh", this.getSubnetsForCurrentRegion);
  }

  beforeDestroy(): void {
    this.$root.$off("refresh");
  }
}
</script>

<style scoped></style>
