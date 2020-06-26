<template>
  <div>
    <gl-drawer
      :open="drawerOpened && selectedResourceKey !== ''"
      @close="close"
      style="min-width: 80%;"
    >
      <template #header>{{ selectedResourceTitle }}</template>

      <RouteTable
        :routeTable="selectedResource"
        v-on:deleted="close"
        v-on:setmain="reloadSelectedRouteTable"
        :mainRouteAssociationId="mainRouteAssociationForSelectedRoute"
      />
    </gl-drawer>

    <div class="container-fluid">
      <div
        class="row justify-content-between mt-3 mb-2 ml-2 mr-2"
        v-if="resourcesAsList.length > 0"
      >
        <gl-form-input
          class="col-12 col-sm-8 col-lg-9 mb-3 mb-sm-0"
          id="filter"
          v-model="filter"
          placeholder="Type to filter..."
        />

        <gl-button
          icon="plus"
          category="secondary"
          variant="success"
          class="col-12 col-sm-3 col-lg-2"
          to="/network/routeTables/new"
          >Create new route table
        </gl-button>
      </div>
      <gl-table
        :items="resourcesAsList"
        :fields="fields"
        :filter="filter"
        :busy="isLoading"
        ref="resourcesTable"
        :primary-key="resourceUniqueKey"
        selectable
        select-mode="single"
        @row-selected="onRowSelected"
        v-show="resourcesAsList.length > 0"
        show-empty
        hover
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
            v-if="data.item.Associations.filter((a) => a.Main).length > 0"
            name="check-circle"
          />
        </template>
        <template v-slot:cell(associations)="data">
          {{ data.item.Associations.filter((a) => a.SubnetId).length }}
        </template>
      </gl-table>

      <div class="container">
        <gl-skeleton-loading
          class="mt-5"
          v-if="isLoading && resourcesAsList.length < 1"
        />

        <gl-empty-state
          class="mt-5"
          v-if="!isLoading && resourcesAsList.length === 0"
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
import {
  DescribeRouteTablesRequest,
  RouteTable as EC2RouteTable,
} from "aws-sdk/clients/ec2";
import RegionText from "@/components/common/RegionText.vue";
import {
  GlButton,
  GlDrawer,
  GlEmptyState,
  GlFormInput,
  GlIcon,
  GlModalDirective,
  GlSkeletonLoading,
  GlTable,
} from "@gitlab/ui";
import Component from "vue-class-component";
import StateText from "@/components/common/StateText.vue";
import RouteTable from "@/components/network/routeTables/RouteTable.vue";
import { NetworkComponent } from "@/components/network/networkComponent";

@Component({
  components: {
    StateText,
    GlTable,
    RegionText,
    GlIcon,
    GlDrawer,
    RouteTable,
    GlButton,
    GlFormInput,
    GlSkeletonLoading,
    GlEmptyState,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
  },
})
export default class RouteTableList extends NetworkComponent<
  EC2RouteTable,
  "RouteTableId"
> {
  resourceName = "route table";
  canCreate = true;
  resourceUniqueKey: "RouteTableId" = "RouteTableId";

  fields = [
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: this.extractNameFromTags,
    },
    { key: "RouteTableId", sortable: true },
    { key: "region", sortable: true },
    { key: "VpcId", sortable: true },
    { key: "associations", label: "# subnets associated" },

    {
      key: "Main",
      label: "Main?",
      class: "text-center",
    },
  ];

  get mainRouteAssociationForSelectedRoute(): string {
    if (!this.selectedResource) {
      return "";
    }

    const mainTables = this.resourcesAsList.filter(
      (r) =>
        r.VpcId === this.selectedResource?.VpcId &&
        r.Associations &&
        r.Associations.filter((a) => a.Main).length > 0
    );
    if (mainTables.length < 1 || !mainTables[0].Associations) {
      return "";
    }

    return (
      mainTables[0].Associations.filter((a) => a.Main).map(
        (a) => a.RouteTableAssociationId
      )[0] || ""
    );
  }

  async getResourcesForRegion(
    region: string,
    filterByRouteId?: string[]
  ): Promise<EC2RouteTable[]> {
    const EC2 = await this.client(region);
    if (!EC2) {
      return [];
    }
    const params: DescribeRouteTablesRequest = {};
    if (filterByRouteId) {
      params.RouteTableIds = filterByRouteId;
    }

    const data = await EC2.describeRouteTables(params).promise();

    if (data.RouteTables === undefined) {
      return [];
    }

    return data.RouteTables;
  }
}
</script>
