<template>
  <div>
    <gl-alert
      v-if="routeTablesState === 'error'"
      variant="danger"
      :dismissible="false"
      >{{ routeTablesError }}
    </gl-alert>

    <gl-table
      :items="routeTables"
      :fields="routeTablesFields"
      borderless
      small
      hover
      :busy="routeTablesState === 'loading'"
      thead-class="hidden-header"
      show-empty
      empty-text="Daintree hasn't found any related route table!"
    >
      <template v-slot:cell(RouteTableId)="data">
        <gl-link :to="`/network/routeTables?routeTableId=${data.value}`">{{
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
import EC2Client, { RouteTableList } from "aws-sdk/clients/ec2";
import { GlTable, GlSkeletonLoading, GlLink, GlAlert } from "@gitlab/ui";
import { Formatters } from "@/mixins/formatters";
import { mixins } from "vue-class-component";
import { extractNameFromEC2Tags } from "@/components/common/tags";

@Component({
  components: {
    GlTable,
    GlSkeletonLoading,
    GlLink,
    GlAlert,
  },
})
export default class RelatedRoutesTable extends mixins(
  DaintreeComponent,
  Formatters
) {
  @Prop(String) readonly region!: string;
  @Prop(String) readonly filterKey!: string;
  @Prop(String) readonly filterValue!: string;

  routeTables: RouteTableList | undefined = [];
  routeTablesState: "loading" | "loaded" | "empty" | "error" = "loading";
  routeTablesError: string | undefined;
  routeTablesFields = [
    { key: "RouteTableId", sortable: true },
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: extractNameFromEC2Tags,
    },
    "OwnerId",
  ];

  async EC2Client(): Promise<EC2Client | void> {
    const credentials = await this.credentials();

    if (credentials === undefined) {
      return;
    }

    return new EC2Client({ region: this.region, credentials });
  }

  async describeRoutesTables(): Promise<void> {
    const params = {
      Filters: [
        {
          Name: this.filterKey,
          Values: [this.filterValue],
        },
      ],
    };
    this.routeTables = [];
    this.routeTablesState = "loading";
    this.routeTablesError = undefined;

    const EC2 = await this.EC2Client();

    if (!EC2) {
      return;
    }

    try {
      const data = await EC2.describeRouteTables(params).promise();
      this.routeTables = data.RouteTables;
      this.routeTablesError = undefined;
      this.routeTablesState =
        this.routeTables === undefined || this.routeTables.length === 0
          ? "empty"
          : "loaded";
    } catch (err) {
      this.routeTablesError = err.message;
      this.routeTablesState = "error";
    }
  }

  @Watch("filterValue")
  onFilterChanged(): void {
    this.describeRoutesTables();
  }

  mounted(): void {
    this.describeRoutesTables();
  }
}
</script>
