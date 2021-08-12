<template>
  <div>
    <gl-drawer
      :open="drawerOpened && selectedResourceKey !== ''"
      @close="close"
      style="min-width: 80%"
    >
      <template #header>{{ selectedResourceTitle }}</template>

      <Cluster v-if="selectedResource" :cluster="selectedResource" />
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

        <template v-slot:cell(status)="data">
          <StateText :state="data.value" />
        </template>

        <template v-slot:cell(registeredContainerInstancesCount)="data">
          <gl-loading-icon
            inline
            v-if="!data.value && data.value !== 0"
          ></gl-loading-icon>
          {{ data.value }}
        </template>

        <template v-slot:cell(runningTasksCount)="data">
          <gl-loading-icon
            inline
            v-if="!data.value && data.value !== 0"
          ></gl-loading-icon>
          {{ data.value }}
        </template>

        <template v-slot:cell(pendingTasksCount)="data">
          <gl-loading-icon
            inline
            v-if="!data.value && data.value !== 0"
          ></gl-loading-icon>
          {{ data.value }}
        </template>

        <template v-slot:cell(activeServicesCount)="data">
          <gl-loading-icon
            inline
            v-if="!data.value && data.value !== 0"
          ></gl-loading-icon>
          {{ data.value }}
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
  GlLink,
  GlModalDirective,
  GlSkeletonLoading,
  GlTable,
  GlTooltipDirective,
  GlLoadingIcon,
} from "@gitlab/ui";
import Component from "vue-class-component";
import StateText from "@/components/common/StateText.vue";
import Peering from "@/components/network/peering/Peering.vue";
import { EcsComponent } from "@/components/ECS/ecsComponent";
import {
  DescribeClustersRequest,
  ListClustersRequest,
} from "aws-sdk/clients/ecs";
import TasksDefinitionsForFamily from "@/components/ECS/taskDefinitions/TasksDefinitionsForFamily.vue";
import Cluster from "@/components/ECS/clusters/Cluster.vue";

@Component({
  components: {
    Cluster,
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
    GlLoadingIcon,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
    "gl-tooltip": GlTooltipDirective,
  },
})
export default class ClusterList extends EcsComponent<
  { [key: string]: string },
  "arn" | "state"
> {
  readonly resourceName = "cluster";
  readonly canCreate = false;
  readonly resourceUniqueKey: "arn" = "arn";
  readonly resourceStateKey: "state" = "state";
  readonly workingStates = ["PROVISIONING", "DEPROVISIONING"];

  readonly fields = [
    { key: "clusterName", label: "Cluster name", sortable: true },
    "status",
    { key: "region", sortable: true },
    {
      key: "registeredContainerInstancesCount",
      label: "# container instances",
      sortable: true,
    },
    { key: "runningTasksCount", label: "# running tasks", sortable: true },
    { key: "pendingTasksCount", label: "# pending tasks", sortable: true },
    { key: "activeServicesCount", label: "# active services", sortable: true },
  ];

  async getResourcesForRegion(
    region: string,
    filter: string[]
  ): Promise<{ [key: string]: string }[]> {
    const client = await this.client(region);
    if (!client) {
      return [];
    }

    if (filter && filter.length > 0) {
      const params: DescribeClustersRequest = { clusters: filter };

      client.describeClusters(params, (err, data) => {
        if (err) {
          this.showError(err.message, this.resourceName, region);
        } else if (data.clusters) {
          data.clusters.forEach((c) => {
            if (c.clusterArn) {
              this.$set(this.resources, c.clusterArn, {
                arn: c.clusterArn,
                region,
                stillPresent: true,
                ...c,
              });
            }
          });
        }
      });

      return filter.map((s) => ({ arn: s }));
    }

    const params: ListClustersRequest = {};

    const data = await client.listClusters(params).promise();
    if (data.clusterArns === undefined) {
      return [];
    }

    const result = data.clusterArns.map((s) => ({ arn: s }));

    result.forEach((c) => {
      const params: DescribeClustersRequest = { clusters: [c.arn] };

      client.describeClusters(params, (err, data) => {
        if (err) {
          this.showError(err.message, this.resourceName, region);
        } else if (data.clusters) {
          this.$set(this.resources, c.arn, {
            arn: c.arn,
            region,
            stillPresent: true,
            ...data.clusters[0],
          });
        }
      });
    });

    return result;
  }
}
</script>
