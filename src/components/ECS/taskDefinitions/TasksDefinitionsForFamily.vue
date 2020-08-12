<template>
  <div>
    <gl-dropdown
      lazy
      icon="list-task"
      :text="$route.query.task || 'Select a revision'"
      block
      variant="info"
      category="secondary"
    >
      <gl-search-box-by-type v-model.trim="searchTerm" class="m-2" />
      <gl-dropdown-header>
        Active tasks
      </gl-dropdown-header>
      <gl-dropdown-item
        :href="`#/ecs/tasksDefinitions?family=${family}&task=${encodeURIComponent(
          task
        )}`"
        :is-check-item="true"
        v-for="task in activeTaskRevisions"
        :key="task"
        :is-checked="task === decodeURIComponent($route.query.task || '')"
      >
        {{ task }}
      </gl-dropdown-item>
      <gl-dropdown-header>Inactive tasks</gl-dropdown-header>
      <gl-dropdown-item
        :href="`#/ecs/tasksDefinitions?family=${family}&task=${encodeURIComponent(
          task
        )}`"
        :is-check-item="true"
        v-for="task in inactiveTaskRevisions"
        :key="task"
        :is-checked="task === decodeURIComponent($route.query.task || '')"
      >
        {{ task }}
      </gl-dropdown-item>
    </gl-dropdown>

    <gl-alert variant="danger" v-if="errorMessage">
      {{ errorMessage }}
    </gl-alert>

    <TaskDefinition
      v-if="$route.query.task"
      :region="region"
      :task="$route.query.task"
    />

    <gl-empty-state
      class="mt-5"
      v-if="!$route.query.task"
      title="Select a revision"
      svg-path="/assets/undraw_select_13cv.svg"
      description="Please select a revision of the task from the dropdown menu above"
      compact
    />
  </div>
</template>
<script lang="ts">
import {
  GlDropdown,
  GlDropdownHeader,
  GlDropdownItem,
  GlSearchBoxByType,
  GlEmptyState,
  GlAlert,
} from "@gitlab/ui";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import { Component, Prop, Watch } from "vue-property-decorator";
import ECS from "aws-sdk/clients/ecs";
import TaskDefinition from "@/components/ECS/taskDefinitions/TaskDefinition.vue";

@Component({
  components: {
    TaskDefinition,
    GlDropdown,
    GlDropdownHeader,
    GlDropdownItem,
    GlEmptyState,
    GlAlert,
    GlSearchBoxByType,
  },
})
export default class TasksDefinitionsForFamily extends DaintreeComponent {
  @Prop(String) readonly region!: string;
  @Prop(String) readonly family!: string;
  errorMessage = "";
  searchTerm = "";

  tasksRevisions: { ACTIVE: string[]; INACTIVE: string[] } = {
    ACTIVE: [],
    INACTIVE: [],
  };

  get activeTaskRevisions(): string[] {
    const lowerCasedSearchTerm = this.searchTerm.toLowerCase();
    return this.tasksRevisions["ACTIVE"].filter((revision) =>
      revision.toLowerCase().includes(lowerCasedSearchTerm)
    );
  }

  get inactiveTaskRevisions(): string[] {
    const lowerCasedSearchTerm = this.searchTerm.toLowerCase();
    return this.tasksRevisions["INACTIVE"].filter((revision) =>
      revision.toLowerCase().includes(lowerCasedSearchTerm)
    );
  }

  async retrieveTasks(status: "ACTIVE" | "INACTIVE"): Promise<void> {
    const credentials = await this.credentials();
    if (!credentials) {
      return;
    }

    const client = new ECS({ region: this.region, credentials });
    const data = await client
      .listTaskDefinitions({ familyPrefix: this.family, status, sort: "DESC" })
      .promise();
    this.tasksRevisions[status] =
      data.taskDefinitionArns?.map(this.extractTaskRevision) || [];
  }

  async retrieveData(): Promise<void> {
    try {
      await Promise.all([
        this.retrieveTasks("ACTIVE"),
        this.retrieveTasks("INACTIVE"),
      ]);
    } catch (err) {
      this.errorMessage = err;
    }
  }

  extractTaskRevision(task: string): string {
    const taskParts = task.split("/");
    return taskParts[taskParts.length - 1];
  }

  @Watch("family")
  onFamilyChanged(): void {
    this.retrieveData();
  }

  mounted(): void {
    this.retrieveData();
  }
}
</script>
