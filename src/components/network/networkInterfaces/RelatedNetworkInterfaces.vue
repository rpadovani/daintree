<template>
  <div>
    <gl-alert
      v-if="networkInterfacesState === 'error'"
      variant="danger"
      :dismissible="false"
      >{{ networkInterfacesError }}
    </gl-alert>

    <gl-table
      :items="networkInterfaces"
      :fields="networkInterfacesFields"
      borderless
      small
      hover
      :busy="networkInterfacesState === 'loading'"
      thead-class="hidden-header"
      show-empty
      empty-text="Daintree hasn't found any related network interface!"
    >
      <template v-slot:cell(status)="data">
        <StateText :state="data.value" />
      </template>

      <template v-slot:cell(NetworkInterfaceId)="data">
        <gl-link :to="`/network/interfaces?NetworkInterfaceId=${data.value}`">{{
          data.value
        }}</gl-link>
      </template>

      <template v-slot:table-busy>
        <gl-skeleton-loading />
      </template>
    </gl-table>
  </div>
</template>

<script lang="ts">
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import { Component, Prop, Watch } from "vue-property-decorator";
import EC2Client, { NetworkInterfaceList } from "aws-sdk/clients/ec2";
import { GlTable, GlSkeletonLoading, GlAlert, GlLink } from "@gitlab/ui";
import { Formatters } from "@/mixins/formatters";
import { mixins } from "vue-class-component";
import StateText from "@/components/common/StateText.vue";

@Component({
  components: {
    GlTable,
    GlSkeletonLoading,
    GlAlert,
    GlLink,
    StateText,
  },
})
export default class RelatedNetworkInterfaces extends mixins(
  DaintreeComponent,
  Formatters
) {
  @Prop(String) readonly region!: string;
  @Prop(String) readonly filterName!: string;
  @Prop(String) readonly filterValues!: string[];

  networkInterfaces: NetworkInterfaceList | undefined = [];
  networkInterfacesState: "loading" | "loaded" | "empty" | "error" = "loading";
  networkInterfacesError: string | undefined;
  readonly networkInterfacesFields = [
    {
      key: "TagSet",
      label: "Name",
      sortByFormatter: true,
      formatter: this.extractNameFromTags,
    },
    {
      key: "NetworkInterfaceId",
      label: "Interface Id",
      sortable: true,
    },
    { key: "PrivateIpAddress", sortable: true },
    {
      key: "InterfaceType",
      sortable: true,
    },
    { key: "Status" },
  ];

  async EC2Client(): Promise<EC2Client | void> {
    const credentials = await this.credentials();

    if (credentials === undefined) {
      return;
    }

    return new EC2Client({ region: this.region, credentials });
  }

  async describeNetworkInterfaces(): Promise<void> {
    const params = {
      Filters: [
        {
          Name: this.filterName,
          Values: this.filterValues,
        },
      ],
    };
    this.networkInterfaces = [];
    this.networkInterfacesState = "loading";
    this.networkInterfacesError = undefined;

    const EC2 = await this.EC2Client();

    if (!EC2) {
      return;
    }

    try {
      const data = await EC2.describeNetworkInterfaces(params).promise();
      this.networkInterfaces = data.NetworkInterfaces;
      this.networkInterfacesError = undefined;
      this.networkInterfacesState =
        this.networkInterfaces === undefined ||
        this.networkInterfaces.length === 0
          ? "empty"
          : "loaded";
    } catch (err) {
      this.networkInterfacesError = err.message;
      this.networkInterfacesState = "error";
    }
  }

  @Watch("filterValues")
  onFilterChanged(): void {
    this.describeNetworkInterfaces();
  }

  mounted(): void {
    this.describeNetworkInterfaces();
  }
}
</script>
