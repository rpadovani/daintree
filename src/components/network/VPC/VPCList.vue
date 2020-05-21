<template>
  <div>
    <Header v-on:refresh="getAllResources" :loading="loadingCount > 0" />

    <gl-drawer
      :open="drawerOpened && selectedResourceKey !== ''"
      @close="close"
      style="width: 80%;"
    >
      <template #header>{{ selectedResourceTitle }}</template>

      <VPC :vpc="selectedResource" v-on:deleted="close" />
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
          to="/network/vpcs/new"
          >Create new VPC
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
        <template v-slot:cell(region)="data">
          <RegionText :region="data.value" />
        </template>
        <template v-slot:cell(IsDefault)="data">
          <gl-icon v-if="data.value" name="check-circle" />
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
          title="No Vpc found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <gl-button icon="plus" variant="success" to="/network/vpcs/new"
              >Create new VPC
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
import { DescribeVpcsRequest, Vpc } from "aws-sdk/clients/ec2";

import Header from "@/components/Header/Header.vue";
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
import { vpcs } from "@/components/network/VPC/vpc";
import VPC from "@/components/network/VPC/VPC.vue";
import StateText from "@/components/common/StateText.vue";
import { NetworkComponent } from "@/components/network/networkComponent";
import VpcWithRegion = vpcs.VpcWithRegion;

@Component({
  components: {
    StateText,
    Header,
    GlTable,
    RegionText,
    GlIcon,
    GlDrawer,
    VPC,
    GlButton,
    GlFormInput,
    GlSkeletonLoading,
    GlEmptyState,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
  },
})
export default class VPCList extends NetworkComponent<Vpc, "VpcId" | "State"> {
  resourceName = "vpc";
  canCreate = true;
  resourceUniqueKey: "VpcId" = "VpcId";
  resourceStateKey: "State" = "State";
  workingStates = ["pending", "deleting"];

  fields = [
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: this.extractNameFromTags,
    },
    { key: "VpcId", sortable: true },
    "State",
    { key: "CidrBlock", sortable: true },
    { key: "region", sortable: true },
    {
      key: "IsDefault",
      label: "Default?",
      class: "text-center",
    },
    { key: "DhcpOptionsId", sortable: true },
  ];

  async getResourcesForRegion(region: string, filterByVpcsId?: string[]) {
    const EC2 = await this.client(region);
    if (!EC2) {
      return [];
    }

    const params: DescribeVpcsRequest = {};
    if (filterByVpcsId) {
      params.Filters = [
        {
          Name: "vpc-id",
          Values: filterByVpcsId,
        },
      ];
    }

    try {
      const data = await EC2.describeVpcs(params).promise();
      if (data.Vpcs === undefined) {
        return [];
      }
      return data.Vpcs;
    } catch (err) {
      this.showError(`[${region}] ` + err, `${region}#loadingVpc`);
      return [];
    }
  }

  //This is necessary 'cause calling the parent directly from the template breaks the scope
  onRowSelected(resources: VpcWithRegion[]) {
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
