<template>
  <div>
    <gl-drawer
      :open="drawerOpened && selectedResourceKey !== ''"
      @close="close"
      style="min-width: 80%;"
    >
      <template #header>{{ selectedResourceTitle }}</template>

      <KeyPair :keyPair="selectedResource" v-on:deleted="close" />
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
          to="/ec2/keyPairs/new"
          >Create new key pair
        </gl-button>
      </div>
      <gl-table
        :items="resourcesAsList"
        :fields="fields"
        :filter="filter"
        :busy="isLoading"
        ref="resourcesTable"
        selectable
        select-mode="single"
        @row-selected="(row) => onRowSelected(row)"
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
        <template v-slot:cell(region)="data">
          <RegionText :region="data.value" />
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
          title="No key pair found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <gl-button icon="plus" variant="success" to="/ec2/keyPairs/new"
              >Create new key pair
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
  DescribeKeyPairsRequest,
  KeyPair as AWSKeyPair,
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
import { NetworkComponent } from "@/components/network/networkComponent";
import KeyPair from "@/components/EC2/keyPairs/KeyPair.vue";

@Component({
  components: {
    KeyPair,
    GlTable,
    RegionText,
    GlIcon,
    GlDrawer,
    GlButton,
    GlFormInput,
    GlSkeletonLoading,
    GlEmptyState,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
  },
})
export default class KeyPairsList extends NetworkComponent<
  AWSKeyPair,
  "KeyPairId"
> {
  resourceName = "key pair";
  canCreate = true;
  resourceUniqueKey: "KeyPairId" = "KeyPairId";
  resourceStateKey = undefined;
  workingStates = [];

  fields = [
    { key: "KeyName", sortable: true },
    { key: "KeyPairId", sortable: true },
    { key: "KeyFingerprint", sortable: true },
    { key: "region", sortable: true },
  ];

  get selectedResourceTitle() {
    return this.selectedResource?.KeyName || "";
  }

  async getResourcesForRegion(region: string, filterByKeyPairsId?: string[]) {
    const EC2 = await this.client(region);
    if (!EC2) {
      return [];
    }

    const params: DescribeKeyPairsRequest = {};
    if (filterByKeyPairsId) {
      params.Filters = [
        {
          Name: "key-pair-id",
          Values: filterByKeyPairsId,
        },
      ];
    }

    const data = await EC2.describeKeyPairs(params).promise();
    if (data.KeyPairs === undefined) {
      return [];
    }
    return data.KeyPairs;
  }
}
</script>
