<template>
  <div>
    <gl-alert v-if="state === 'error'" variant="danger" :dismissible="false"
      >{{ error }}
    </gl-alert>
    <gl-skeleton-loading v-if="state === 'loading'" />

    <gl-table :items="subnets" :fields="fields" v-if="subnets.length > 0">
      <template v-slot:cell(SubnetId)="data">
        <router-link :to="`/network/subnets?subnetId=${data.value}`">{{
          data.value
        }}</router-link>
      </template>

      <template v-slot:cell(AvailabilityZone)="data">
        <RegionText :region="data.value" is-az />
      </template>
    </gl-table>

    <gl-empty-state
      v-if="state === 'empty'"
      title="No related subnets"
      svg-path="/assets/undraw_empty_xct9.svg"
      description="Daintree hasn't found any subnet associated to this VPC!"
      compact
    />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Watch } from "vue-property-decorator";
import { SubnetList } from "aws-sdk/clients/ec2";
import EC2Client from "aws-sdk/clients/ec2";

import { GlEmptyState, GlTable, GlAlert, GlSkeletonLoading } from "@gitlab/ui";
import { extractNameFromEC2Tags } from "@/components/common/tags";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import RegionText from "@/components/common/RegionText.vue";

@Component({
  components: {
    GlEmptyState,
    GlTable,
    GlAlert,
    GlSkeletonLoading,
    RegionText,
  },
})
export default class SubnetTab extends DaintreeComponent {
  @Prop(String) readonly region: string | undefined;

  @Prop(String) readonly filterName: string | undefined;
  @Prop(Array) readonly filterValues: string[] | undefined;

  subnets: SubnetList | undefined = [];
  state: "loading" | "loaded" | "empty" | "error" = "loading";
  error: string | undefined;
  fields = [
    { key: "SubnetId", sortable: true },
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: extractNameFromEC2Tags,
    },
    { key: "AvailabilityZone", sortable: true },
    { key: "CidrBlock", sortable: true },
    {
      key: "AvailableIpAddressCount",
      label: "# available IPs",
      class: "text-center",
    },
    {
      key: "MapPublicIpOnLaunch",
      label: "Assign public IP on launch?",
      class: "text-center",
    },
  ];

  async EC2Client(): Promise<EC2Client | void> {
    const credentials = await this.credentials();

    if (credentials === undefined) {
      return;
    }

    return new EC2Client({ region: this.region, credentials });
  }

  async describeSubnets(fullReload = false): Promise<void> {
    if (fullReload) {
      this.state = "loading";
      this.subnets = [];
    }

    const params = {
      Filters: [{ Name: this.filterName, Values: this.filterValues }],
    };

    const EC2 = await this.EC2Client();

    if (!EC2) {
      return;
    }

    try {
      const response = await EC2.describeSubnets(params).promise();
      this.error = undefined;
      this.subnets = response.Subnets;
      this.state =
        this.subnets === undefined || this.subnets.length === 0
          ? "empty"
          : "loaded";
    } catch (err) {
      this.error = err.message;
      this.state = "error";
    }
  }

  @Watch("filterValues")
  onFilterValuesChanged(): void {
    this.describeSubnets(true);
  }

  mounted(): void {
    this.describeSubnets();
  }
}
</script>
