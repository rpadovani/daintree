<template>
  <div>
    <gl-drawer
      :open="drawerOpened && selectedResourceKey !== ''"
      @close="close"
      style="min-width: 80%;"
    >
      <template #header>{{ selectedResourceTitle }}</template>

      <TasksDefinitionsForFamily
        v-if="selectedResource"
        :region="selectedResource.region"
        :family="selectedResource.family"
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

        <!--        <gl-button-->
        <!--          icon="plus"-->
        <!--          category="secondary"-->
        <!--          variant="success"-->
        <!--          class="col-12 col-sm-3 col-lg-2"-->
        <!--          to="/network/peeringConnections/new"-->
        <!--          >New peering connection-->
        <!--        </gl-button>-->
      </div>
      <gl-table
        :items="resourcesAsList"
        :fields="fields"
        :filter="filter"
        :busy="isLoading"
        ref="resourcesTable"
        primary-key="family"
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
          v-else-if="!isLoading && resourcesAsList.length === 0"
          title="No ECS tasks found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <!--            <gl-button-->
            <!--              icon="plus"-->
            <!--              variant="success"-->
            <!--              to="/network/peeringConnections/new"-->
            <!--              >New peering connection-->
            <!--            </gl-button>-->
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
  GlLink,
  GlTooltipDirective,
} from "@gitlab/ui";
import Component from "vue-class-component";
import StateText from "@/components/common/StateText.vue";
import Peering from "@/components/network/peering/Peering.vue";
import { EcsComponent } from "@/components/ECS/ecsComponent";
import { ListTaskDefinitionFamiliesRequest } from "aws-sdk/clients/ecs";
import TasksDefinitionsForFamily from "@/components/ECS/taskDefinitions/TasksDefinitionsForFamily.vue";

@Component({
  components: {
    TasksDefinitionsForFamily,
    StateText,
    GlTable,
    RegionText,
    GlIcon,
    GlDrawer,
    GlButton,
    GlFormInput,
    GlSkeletonLoading,
    GlEmptyState,
    GlLink,
    Peering,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
    "gl-tooltip": GlTooltipDirective,
  },
})
export default class TasksDefinitionsList extends EcsComponent<
  { [key: string]: string },
  "family"
> {
  resourceName = "task definition";
  canCreate = false;
  resourceUniqueKey: "family" = "family";
  workingStates = [];

  fields = [
    { key: "family", sortable: "true" },
    { key: "region", sortable: "true" },
    { key: "show_details", label: "" },

    // {
    //   key: "Tags",
    //   label: "Name",
    //   sortByFormatter: true,
    //   formatter: this.extractNameFromTags,
    // },
    // { key: "VpcPeeringConnectionId", label: "Peering Id", sortable: true },
    // { key: "Status", label: "State" },
    // {
    //   key: "RequesterVPC",
    //   label: "Requester VPC",
    // },
    // {
    //   key: "AccepterVPC",
    //   label: "Accepter VPC",
    // },
    // {
    //   key: "RequesterCIDRs",
    //   label: "Requester CIDRs",
    // },
    // {
    //   key: "AccepterCIDRs",
    //   label: "Accepter CIDRs",
    // },
    // { key: "region", sortable: true },
  ];

  async getResourcesForRegion(
    region: string
  ): Promise<{ [key: string]: string }[]> {
    const client = await this.client(region);
    if (!client) {
      return [];
    }

    const params: ListTaskDefinitionFamiliesRequest = {};

    const data = await client.listTaskDefinitionFamilies(params).promise();
    if (data.families === undefined) {
      return [];
    }
    return data.families.map((s) => {
      return { family: s };
    });
  }
}
</script>
