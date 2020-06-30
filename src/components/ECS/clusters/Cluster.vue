<template>
  <div>
    <gl-alert
      variant="danger"
      v-if="errorMessage !== ''"
      @dismiss="() => (errorMessage = '')"
      >{{ errorMessage }}</gl-alert
    >
    <gl-tabs theme="blue">
      <gl-tab title="Overview">
        <DrawerCards :cards="overviewCards" />

        <TagsTable
          provider="ECS"
          :resource-id="updatedCluster.clusterArn"
          :region="updatedCluster.region"
          :key="updatedCluster.clusterArn"
        />
      </gl-tab>
      <gl-tab title="Capacity provider strategy">
        <gl-table
          :items="updatedCluster.defaultCapacityProviderStrategy"
          borderless
          small
          hover
          show-empty
          empty-text="Daintree hasn't found any default capacity provider strategy!"
        />
      </gl-tab>
      <gl-tab title="Statistics">
        <DrawerCards :cards="statisticCards" />
      </gl-tab>

      <gl-tab title="Attachments">
        <DrawerCards :cards="attachmentsCards" />

        <gl-table
          :items="updatedCluster.attachments"
          borderless
          small
          hover
          show-empty
          empty-text="Daintree hasn't found any attachment to this cluster!"
        />
      </gl-tab>

      <gl-tab title="Settings">
        <DrawerCards :cards="settingCards" />
      </gl-tab>
    </gl-tabs>
  </div>
</template>

<script lang="ts">
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import ECS, {
  Cluster as ECSCluster,
  DescribeClustersRequest,
} from "aws-sdk/clients/ecs";
import { Prop, Component, Watch } from "vue-property-decorator";
import { Metadata } from "@/mixins/DaintreeListComponent";
import { GlTabs, GlTab, GlTable, GlAlert } from "@gitlab/ui";
import { CardContent } from "@/components/common/cardContent";
import DrawerCards from "@/components/common/DrawerCards.vue";
import TagsTable from "@/components/common/TagsTable.vue";

@Component({
  components: {
    TagsTable,
    DrawerCards,
    GlTabs,
    GlTab,
    GlTable,
    GlAlert,
  },
})
export default class Cluster extends DaintreeComponent {
  @Prop(Object) readonly cluster!: ECSCluster & Metadata;

  private freshCluster: ECSCluster & Metadata = {};
  private errorMessage = "";

  get updatedCluster(): ECSCluster & Metadata {
    if (this.freshCluster.clusterArn !== this.cluster.clusterArn) {
      return this.cluster;
    }

    return this.freshCluster;
  }

  get overviewCards(): CardContent[] {
    return [
      {
        title: "Cluster name",
        value: this.updatedCluster.clusterName,
        helpText:
          "A user-generated string that you use to identify your cluster.",
      },
      {
        title: "Status",
        value: this.updatedCluster.status,
        helpText: "The status of the cluster.",
        isState: true,
      },
      {
        title: "Region",
        value: this.updatedCluster.region,
        isRegion: true,
      },
      {
        title: "# registered container instances",
        value: this.updatedCluster.registeredContainerInstancesCount,
        helpText:
          "The number of container instances registered into the cluster. This includes container instances in both ACTIVE and DRAINING status.",
      },
      {
        title: "# running tasks",
        value: this.updatedCluster.runningTasksCount,
        helpText:
          "The number of tasks in the cluster that are in the RUNNING state.",
      },
      {
        title: "# pending tasks",
        value: this.updatedCluster.pendingTasksCount,
        helpText:
          "The number of tasks in the cluster that are in the PENDING state.",
      },
      {
        title: "# active services",
        value: this.updatedCluster.activeServicesCount,
        helpText:
          "The number of services that are running on the cluster in an ACTIVE state.",
      },
      {
        title: "Capacity providers",
        value: this.updatedCluster.capacityProviders?.join(", "),
        helpText: "The capacity providers associated with the cluster.",
      },
    ];
  }

  get statisticCards(): CardContent[] {
    if (!this.updatedCluster.statistics) {
      return [];
    }

    return this.updatedCluster.statistics.map((s) => ({
      title: s.name || "",
      value: s.value,
    }));
  }

  get settingCards(): CardContent[] {
    if (!this.updatedCluster.settings) {
      return [];
    }

    return this.updatedCluster.settings.map((s) => ({
      title: s.name || "",
      value: s.value,
    }));
  }

  get attachmentsCards(): CardContent[] {
    return [
      {
        title: "Attachment status",
        value: this.updatedCluster.attachmentsStatus,
        helpText:
          "The status of the capacity providers associated with the cluster.",
        isState: true,
      },
    ];
  }

  @Watch("cluster", { immediate: true, deep: true })
  async downloadUpdatedData(): Promise<void> {
    const credentials = await this.credentials();
    const client = new ECS({
      credentials,
      region: this.cluster.region,
    });

    if (!this.cluster.clusterArn) {
      return;
    }

    const params: DescribeClustersRequest = {
      clusters: [this.cluster.clusterArn],
      include: ["ATTACHMENTS", "SETTINGS", "STATISTICS"],
    };

    const data = await client.describeClusters(params).promise();

    if (data.clusters === undefined) {
      return;
    }

    this.freshCluster = { ...data.clusters[0], region: this.cluster.region };
  }
}
</script>

<style scoped></style>
