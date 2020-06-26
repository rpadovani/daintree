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
import { Formatters } from "@/mixins/formatters";
import EC2Client from "aws-sdk/clients/ec2";

import { GlEmptyState, GlTable, GlAlert, GlSkeletonLoading } from "@gitlab/ui";

@Component({
  components: {
    GlEmptyState,
    GlTable,
    GlAlert,
    GlSkeletonLoading,
  },
})
export default class SubnetTab extends Formatters {
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
      formatter: this.extractNameFromTags,
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

  get credentials() {
    return this.$store.getters["sts/credentials"];
  }

  describeSubnets(fullReload = false) {
    if (fullReload) {
      this.state = "loading";
      this.subnets = [];
    }

    const params = {
      Filters: [{ Name: this.filterName, Values: this.filterValues }],
    };
    const EC2 = new EC2Client({
      region: this.region,
      credentials: this.credentials,
    });

    EC2.describeSubnets(params, (err, data) => {
      if (err) {
        this.error = err.message;
        this.state = "error";
      } else {
        this.error = undefined;
        this.subnets = data.Subnets;
        this.state =
          this.subnets === undefined || this.subnets.length === 0
            ? "empty"
            : "loaded";
      }
    });
  }

  @Watch("filterValues")
  onFilterValuesChanged() {
    this.describeSubnets(true);
  }

  mounted() {
    this.describeSubnets();
  }
}
</script>
