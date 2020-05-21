<template>
  <div>
    <Header v-on:refresh="getAllResources" :loading="loadingCount > 0" />

    <gl-drawer
      :open="drawerOpened && selectedResourceKey !== ''"
      @close="close"
      style="width: 80%;"
    >
      <template #header>{{ selectedResourceTitle }}</template>

      <subnet :subnet="selectedResource" v-on:deleted="close" />
    </gl-drawer>

    <div class="container-fluid">
      <div
        class="row justify-content-between mt-3 mb-2 ml-2 mr-2"
        v-if="resourcesAsList.length > 0"
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
          to="/network/subnets/new"
          >Create new subnet
        </gl-button>
      </div>
      <gl-table
        :items="resourcesAsList"
        :fields="fields"
        :filter="filter"
        :busy="loadingCount > 0"
        ref="resourcesTable"
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
        <template v-slot:cell(state)="data">
          <StateText :state="data.value" />
        </template>
        <template v-slot:cell(AvailabilityZone)="data">
          <RegionText :region="data.value" is-az />
        </template>
        <template v-slot:cell(DefaultForAz)="data">
          <gl-icon v-if="data.value" name="check-circle" />
        </template>
        <template v-slot:cell(VpcId)="data">
          <router-link :to="`/network/vpcs?vpcId=${data.value}`">
            {{ data.value }}
          </router-link>
        </template>
      </gl-table>

      <div class="container">
        <gl-skeleton-loading
          class="mt-5"
          v-if="loadingCount > 0 && resourcesAsList.length < 1"
        />

        <gl-empty-state
          class="mt-5"
          v-if="loadingCount === 0 && resourcesAsList.length === 0"
          title="No subnets found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <gl-button icon="plus" variant="success" to="/network/subnets/new"
              >Create new subnet
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
import { DescribeVpcsRequest, Subnet as AWSSubnet } from "aws-sdk/clients/ec2";

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
  GlModalDirective,
} from "@gitlab/ui";
import { Formatters } from "@/mixins/formatters";
import Component, { mixins } from "vue-class-component";
import StateText from "@/components/common/StateText.vue";
import { DescribeSubnetsRequest } from "aws-sdk/clients/ec2";
import Notifications from "@/mixins/notifications";
import { Watch } from "vue-property-decorator";
import Subnet from "@/components/network/subnets/Subnet.vue";
import { Subnets } from "@/components/network/subnets/subnet";
import SubnetWithRegion = Subnets.SubnetWithRegion;
import { NetworkComponent } from "@/components/network/networkComponent";

@Component({
  components: {
    StateText,
    Header,
    GlTable,
    RegionText,
    GlIcon,
    GlDrawer,
    Subnet,
    GlButton,
    GlFormInput,
    GlSkeletonLoading,
    GlEmptyState,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
  },
})
export default class SubnetList extends NetworkComponent<
  AWSSubnet,
  "SubnetId" | "State"
> {
  resourceName = "subnet";
  canCreate = true;
  resourceUniqueKey: "SubnetId" = "SubnetId";
  resourceStateKey: "State" = "State";
  workingStates = ["pending", "deleting"];

  fields = [
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: this.extractNameFromTags,
    },
    { key: "SubnetId", sortable: true },
    "State",
    { key: "CidrBlock", sortable: true },
    { key: "AvailabilityZone", sortable: true },
    {
      key: "DefaultForAz",
      label: "Default?",
      class: "text-center",
    },
    { key: "VpcId", sortable: true },
  ];

  async getResourcesForRegion(region: string, filterBySubnetsId?: string[]) {
    const EC2 = await this.client(region);
    if (!EC2) {
      return [];
    }

    const params: DescribeSubnetsRequest = {};
    if (filterBySubnetsId) {
      params.Filters = [
        {
          Name: "subnet-id",
          Values: filterBySubnetsId,
        },
      ];
    }

    try {
      const data = await EC2.describeSubnets(params).promise();
      if (data.Subnets === undefined) {
        return [];
      }
      return data.Subnets;
    } catch (err) {
      this.showError(`[${region}] ` + err, `${region}#loadingSubnets`);
      return [];
    }
  }

  //This is necessary 'cause calling the parent directly from the template breaks the scope
  onRowSelected(resources: SubnetWithRegion[]) {
    super.onRowSelected(resources);
  }

  getAllResources() {
    super.getAllResources();
  }

  close() {
    super.close();
  }

  //Hooks do not work in the base abstract class
  destroyed() {
    this.$store.commit("notifications/dismissByKey", "loadingVpc");
  }

  beforeMount() {
    this.getAllResources();
  }
}
</script>

<style scoped></style>
