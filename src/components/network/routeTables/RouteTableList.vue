<template>
  <div>
    <Header v-on:refresh="getAllRouteTables" :loading="loadingCount > 0" />

    <gl-drawer
      :open="drawerOpened && selectedRouteTable !== {}"
      @close="close"
      style="width:80%"
    >
      <template #header>{{ selectedRouteTableTitle }}</template>

      <RouteTable
        :routeTable="selectedRouteTable"
        v-on:deleted="close"
        v-on:setmain="reloadSelectedRouteTable"
        :mainRouteAssociationId="mainRouteAssociationForSelectedRoute"
      />
    </gl-drawer>

    <div class="container-fluid">
      <div
        class="row justify-content-between mt-3 mb-2 ml-2 mr-2"
        v-if="routeTablesAsList.length > 0"
      >
        <gl-form-input
          class="col-9"
          id="filter"
          v-model="filter"
          placeholder="Type to filter..."
        />

        <gl-button
          icon="plus"
          category="secondary"
          variant="success"
          class="col-2"
          to="/network/routeTables/new"
          >Create new route table
        </gl-button>
      </div>
      <gl-table
        :items="routeTablesAsList"
        :fields="fields"
        :filter="filter"
        :busy="loadingCount > 0"
        ref="routeTablesTable"
        selectable
        select-mode="single"
        @row-selected="onRowSelected"
        v-show="routeTablesAsList.length > 0"
        show-empty
      >
        <template v-slot:emptyfiltered="">
          <gl-empty-state
            class="mt-5"
            title="No resource matching your search!"
            svg-path="/assets/undraw_file_searching_duff.svg"
            description="Remove the filter above to see all your resources"
            compact
          />
        </template>
        <template v-slot:cell(VpcId)="data">
          <router-link :to="`/network/vpcs?vpcId=${data.value}`">
            {{ data.value }}
          </router-link>
        </template>
        <template v-slot:cell(region)="data">
          <RegionText :region="data.value" />
        </template>
        <template v-slot:cell(Main)="data">
          <gl-icon
            v-if="data.item.Associations.filter(a => a.Main).length > 0"
            name="check-circle"
          />
        </template>
        <template v-slot:cell(associations)="data">
          {{ data.item.Associations.filter(a => a.SubnetId).length }}
        </template>
      </gl-table>

      <div class="container">
        <gl-skeleton-loading
          class="mt-5"
          v-if="loadingCount > 0 && routeTablesAsList.length < 1"
        />

        <gl-empty-state
          class="mt-5"
          v-if="loadingCount === 0 && routeTablesAsList.length === 0"
          title="No route tables found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <gl-button
              icon="plus"
              variant="success"
              to="/network/routeTables/new"
              >Create new route table
            </gl-button>
            <gl-button
              category="secondary"
              variant="success"
              class="ml-2"
              v-gl-modal-directive="'region-modal-id'"
              >Change selected regions
            </gl-button>
          </template>
        </gl-empty-state>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import EC2Client from "aws-sdk/clients/ec2";

import Header from "@/components/Header/Header.vue";
import RegionText from "@/components/common/RegionText.vue";
import {
  GlDrawer,
  GlFormInput,
  GlIcon,
  GlButton,
  GlTable,
  GlEmptyState,
  GlSkeletonLoading,
  GlModalDirective
} from "@gitlab/ui";
import { Formatters } from "@/mixins/formatters";
import Component, { mixins } from "vue-class-component";
import StateText from "@/components/common/StateText.vue";
import { DescribeRouteTablesRequest } from "aws-sdk/clients/ec2";
import Notifications from "@/mixins/notifications";
import { Watch } from "vue-property-decorator";
import { routeTables } from "@/components/network/routeTables/routeTable";
import RouteTableWithRegion = routeTables.RouteTableWithRegion;
import RouteTable from "@/components/network/routeTables/RouteTable.vue";

@Component({
  components: {
    StateText,
    Header,
    GlTable,
    RegionText,
    GlIcon,
    GlDrawer,
    RouteTable,
    GlButton,
    GlFormInput,
    GlSkeletonLoading,
    GlEmptyState
  },
  directives: {
    "gl-modal-directive": GlModalDirective
  }
})
export default class RouteTableList extends mixins(Formatters, Notifications) {
  routeTables: { [key: string]: RouteTableWithRegion } = {};

  drawerOpened = false;

  selectedRouteTable: RouteTableWithRegion = {};
  filter = "";
  loadingCount = 0;

  fields = [
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: this.extractNameFromTags
    },
    { key: "RouteTableId", sortable: true },
    { key: "region", sortable: true },
    { key: "VpcId", sortable: true },
    { key: "associations", label: "# subnets associated" },

    {
      key: "Main",
      label: "Main?",
      class: "text-center"
    }
  ];

  get routeTablesAsList(): RouteTableWithRegion[] {
    return Object.values(this.routeTables);
  }

  get regionsEnabled(): string[] {
    return this.$store.getters["sts/regions"];
  }

  get currentRoleIndex(): number {
    return this.$store.getters["sts/currentRoleIndex"];
  }

  get emptyStateDescription(): string {
    return (
      "Daintree hasn't found any route table in the selected regions! You can create a new one, or change selected regions in the settings. We have looked in " +
      this.regionsEnabled.join(", ") +
      "."
    );
  }

  get selectedRouteTableTitle() {
    const nameTag = this.selectedRouteTable?.Tags?.filter(
      v => v.Key === "Name"
    );

    if (nameTag && nameTag.length > 0) {
      return `${nameTag[0].Value} (${this.selectedRouteTable?.RouteTableId})`;
    }

    return this.selectedRouteTable?.RouteTableId;
  }

  get mainRouteAssociationForSelectedRoute(): string {
    if (!this.selectedRouteTable) {
      return "";
    }

    const mainTables = this.routeTablesAsList.filter(
      r =>
        r.VpcId === this.selectedRouteTable.VpcId &&
        r.Associations &&
        r.Associations.filter(a => a.Main).length > 0
    );
    if (mainTables.length < 1 || !mainTables[0].Associations) {
      return "";
    }

    return (
      mainTables[0].Associations.filter(a => a.Main).map(
        a => a.RouteTableAssociationId
      )[0] || ""
    );
  }

  get credentials() {
    return this.$store.getters["sts/credentials"];
  }

  getAllRouteTables() {
    this.regionsEnabled.forEach(region => this.getRouteTableForRegion(region));
  }

  getRouteTableForRegion(region: string) {
    this.loadingCount++;

    const EC2 = new EC2Client({
      region,
      credentials: this.credentials
    });
    const params: DescribeRouteTablesRequest = {};

    EC2.describeRouteTables(params, (err, data) => {
      this.loadingCount--;

      if (err) {
        this.showError(`[${region}] ` + err, "loadingRouteTable");
        return;
      }

      Object.keys(this.routeTables).forEach(key => {
        //Keep track if the routeTables of this region are still available
        if (this.routeTables[key].region === region) {
          this.routeTables[key].stillPresent = false;
        }
      });

      data.RouteTables?.forEach(routeTable => {
        if (routeTable.RouteTableId) {
          this.$set(this.routeTables, routeTable.RouteTableId, {
            ...routeTable,
            region,
            stillPresent: true
          });
        }
      });

      //Remove RouteTables we don't find anymore
      Object.keys(this.routeTables).forEach(key => {
        if (
          this.routeTables[key].region === region &&
          !this.routeTables[key].stillPresent
        ) {
          this.$delete(this.routeTables, key);
        }
      });

      //We wait until all the data have been loaded and then we select the row on the table.
      //This is necessary because every time the data of the table is updated, a row selected event with
      //0 elements is emitted, removing our selection
      if (this.$route.query.routeTableId && this.loadingCount === 0) {
        this.$nextTick().then(() => {
          const filteredRouteTables = this.routeTablesAsList.filter(
            routeTable =>
              routeTable.RouteTableId === this.$route.query.routeTableId
          );
          if (filteredRouteTables && filteredRouteTables.length > 0) {
            this.selectedRouteTable = filteredRouteTables[0];
            this.drawerOpened = true;
            const index = this.routeTablesAsList.findIndex(
              routeTable =>
                routeTable.RouteTableId === this.$route.query.routeTableId
            );
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            //@ts-ignore
            this.$refs.routeTablesTable["$children"][0].selectRow(index);
          }
        });
      }
    });
  }

  close() {
    this.drawerOpened = false;

    if (
      this.selectedRouteTable.region &&
      this.selectedRouteTable.RouteTableId
    ) {
      //We do not filter by table id because it could be that the main table has changed
      this.getRouteTableForRegion(this.selectedRouteTable.region);
    }

    this.$router
      .push({ path: "/network/routeTables", query: {} })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .catch(() => {});
    this.selectedRouteTable = {};

    //Do not do this at home!
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    //@ts-ignore
    this.$refs.routeTablesTable["$children"][0].clearSelected();
  }

  onRowSelected(routeTables: RouteTableWithRegion[]) {
    if (routeTables.length > 0) {
      this.selectedRouteTable = routeTables[0];
      this.drawerOpened = true;
      this.reloadSelectedRouteTable(); // Be sure we are showing the latest data about the selected route table
      this.$router
        .push({
          path: "/network/routeTables",
          query: { routeTableId: routeTables[0].RouteTableId }
        })
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .catch(() => {});
    } else {
      this.close();
    }
  }

  reloadSelectedRouteTable() {
    if (
      this.selectedRouteTable &&
      this.selectedRouteTable.region &&
      this.selectedRouteTable.RouteTableId
    ) {
      const EC2 = new EC2Client({
        region: this.selectedRouteTable.region,
        credentials: this.credentials
      });
      const params: DescribeRouteTablesRequest = {};
      params.Filters = [
        {
          Name: "route-table-id",
          Values: [this.selectedRouteTable.RouteTableId]
        }
      ];
      EC2.describeRouteTables(params, (err, data) => {
        if (err) {
          this.showError(
            `[${this.selectedRouteTable.region}] ` + err,
            "loadingRouteTable"
          );
          return;
        }

        data.RouteTables?.forEach(r => {
          if (r.RouteTableId === this.selectedRouteTable.RouteTableId) {
            this.selectedRouteTable = {
              ...r,
              region: this.selectedRouteTable.region
            };
          }
        });
      });
    }
  }

  @Watch("regionsEnabled")
  onRegionsEnabledChanged(newValue: string[], oldValue: string[]) {
    const addedRegions = [...newValue.filter(d => !oldValue.includes(d))];
    const removedRegions = [...oldValue.filter(d => !newValue.includes(d))];

    if (removedRegions.length > 0) {
      this.routeTablesAsList.forEach(routeTable => {
        if (
          routeTable.region &&
          removedRegions.includes(routeTable.region) &&
          routeTable.RouteTableId
        ) {
          this.$delete(this.routeTables, routeTable.RouteTableId);
        }
      });
    }

    addedRegions.forEach(region => this.getRouteTableForRegion(region));
  }

  @Watch("currentRoleIndex")
  onCurrentRoleIndexChanged() {
    this.routeTables = {};
    this.getAllRouteTables();
  }

  beforeMount() {
    this.getAllRouteTables();
  }

  destroyed() {
    this.$store.commit("notifications/dismissByKey", "loadingRouteTable");
  }
}
</script>

<style scoped></style>
