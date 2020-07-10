<template>
  <gl-form-group
    id="vpc-id"
    :label="label"
    label-size="sm"
    :description="description"
    label-for="vpc-input"
    class="mt-2"
  >
    <gl-form-select
      id="vpc-input"
      :disabled="isDisabled"
      v-model="vpcValue"
      :options="vpcsOptions"
      @change="changedVpc"
      required
    />
  </gl-form-group>
</template>

<script lang="ts">
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import { Component, Emit, Model, Prop, Watch } from "vue-property-decorator";

import { GlFormGroup, GlFormSelect } from "@gitlab/ui";
import EC2Client, { VpcList } from "aws-sdk/clients/ec2";
import { mixins } from "vue-class-component";
import { Formatters } from "@/mixins/formatters";

@Component({
  components: {
    GlFormGroup,
    GlFormSelect,
  },
})
export default class VpcDropdown extends mixins(DaintreeComponent, Formatters) {
  @Model("change", { type: String }) readonly vpc!: boolean;
  @Prop({ default: "VPC:" }) readonly label!: string;
  @Prop(String) readonly region = "";
  @Prop(String) readonly description = "";

  private vpcValue = "";
  private vpcs: VpcList = [];

  @Emit("change")
  changedVpc(): string {
    return this.vpcValue;
  }

  get isDisabled(): boolean {
    return this.region === "" || this.isLoading;
  }

  get vpcsOptions(): { value: string; text: string }[] {
    const options: { value: string; text: string }[] = [];

    if (this.isLoading) {
      options.push({
        value: "",
        text: "Loading...",
      });
    } else if (this.isDisabled) {
      options.push({
        value: "",
        text: "Select a region before selecting a VPC",
      });
    } else {
      options.push({ value: "", text: "Select a VPC" });
    }

    this.vpcs.forEach((vpc) => {
      if (vpc.VpcId) {
        let text = vpc.VpcId;
        const name = this.extractNameFromTags(vpc.Tags || []);
        if (name) text += ` - ${name}`;

        const cidr = vpc.CidrBlock;
        if (cidr) text += ` (${cidr})`;

        options.push({ value: vpc.VpcId, text });
      }
    });

    return options;
  }

  @Watch("region", { immediate: true })
  async getVpcsForCurrentRegion(): Promise<void> {
    this.vpcValue = "";

    this.hideErrors("vpcDropdown");
    if (this.region === "") {
      this.vpcs = [];
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
    EC2.describeVpcs(
      { Filters: [{ Name: "state", Values: ["available"] }] },
      (err, data) => {
        this.decreaseLoadingCount();
        if (err) {
          this.showError(err.message, "vpcDropdown");
        } else if (data.Vpcs) {
          this.vpcs = data.Vpcs;
        }
      }
    );
  }

  mounted(): void {
    this.$root.$on("refresh", this.getVpcsForCurrentRegion);
  }

  beforeDestroy(): void {
    this.$root.$off("refresh");
  }
}
</script>

<style scoped></style>
