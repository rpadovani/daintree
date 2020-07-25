<template>
  <div>
    <gl-alert variant="danger" v-if="errorMessage">
      {{ errorMessage }}
    </gl-alert>

    <gl-tabs theme="blue" lazy>
      <gl-tab title="Overview">
        <DrawerCards :cards="cards" />

        <TagsTable
          v-if="taskDefinition.status === 'ACTIVE'"
          :tags="tags"
          :region="region"
          :resource-id="taskDefinition.taskDefinitionArn"
          provider="ECS"
        />
        <p v-else class="mt-9 text-center col-12">
          <i>Inactive tasks cannot have tags</i>
        </p>
      </gl-tab>
      <gl-tab title="Containers">
        <gl-tabs
          theme="blue"
          lazy
          v-if="taskDefinition.containerDefinitions.length > 1"
        >
          <gl-tab
            v-for="container in taskDefinition.containerDefinitions"
            :key="container.name"
            :title="`${container.name}`"
          >
            <SingleContainer :container="container" />
          </gl-tab>
        </gl-tabs>

        <SingleContainer
          v-else-if="taskDefinition.containerDefinitions.length > 0"
          :container="taskDefinition.containerDefinitions[0]"
        />
      </gl-tab>
      <gl-tab title="Volumes">
        <gl-table
          :items="taskDefinition.volumes"
          borderless
          small
          hover
          thead-class="hidden-header"
          show-empty
          empty-text="Daintree hasn't found any related volume"
        />
      </gl-tab>
    </gl-tabs>
  </div>
</template>

<script lang="ts">
import { GlAlert, GlTabs, GlTab, GlTable } from "@gitlab/ui";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import { Component, Prop } from "vue-property-decorator";
import ECS from "aws-sdk/clients/ecs";
import DrawerCards from "@/components/common/DrawerCards.vue";
import { CardContent } from "@/components/common/cardContent";
import TagsTable from "@/components/common/TagsTable.vue";
import SingleContainer from "@/components/ECS/taskDefinitions/SingleContainer.vue";

@Component({
  components: {
    SingleContainer,
    GlAlert,
    GlTabs,
    GlTab,
    DrawerCards,
    TagsTable,
    GlTable,
  },
})
export default class TaskDefinition extends DaintreeComponent {
  @Prop(String) readonly region!: string;
  @Prop(String) readonly task!: string;

  taskDefinition: ECS.TaskDefinition | undefined = {};
  errorMessage = "";
  tags: ECS.Tags | undefined = [];

  get cards(): CardContent[] {
    return [
      {
        title: "CPU",
        value: this.calculateCPU(this.taskDefinition?.cpu),
        helpText: "The number of cpu units used by the task. ",
      },
      {
        title: "Memory",
        value: `${this.taskDefinition?.memory} MiB`,
        helpText: "The amount of memory used by the task.",
      },
      {
        title: "Network mode",
        value: this.taskDefinition?.networkMode,
        helpText:
          "The Docker networking mode to use for the containers in the task. The valid values are none, bridge, awsvpc, and host. The default Docker network mode is bridge. If you are using the Fargate launch type, the awsvpc network mode is required. If you are using the EC2 launch type, any network mode can be used. If the network mode is set to none, you cannot specify port mappings in your container definitions, and the tasks containers do not have external connectivity. The host and awsvpc network modes offer the highest networking performance for containers because they use the EC2 network stack instead of the virtualized network stack provided by the bridge mode.",
      },
      {
        title: "Compatibilities",
        value: this.taskDefinition?.compatibilities?.join(", "),
        helpText:
          "The launch type to use with your task. For more information, see Amazon ECS Launch Types in the Amazon Elastic Container Service Developer Guide.",
      },
      {
        title: "Require compatibilities",
        value: this.taskDefinition?.requiresCompatibilities?.join(", "),
        helpText:
          "The launch type the task requires. If no value is specified, it will default to EC2. Valid values include EC2 and FARGATE.",
      },
      {
        title: "Execution role ARN",
        value: this.taskDefinition?.executionRoleArn,
        helpText:
          "The Amazon Resource Name (ARN) of the task execution role that grants the Amazon ECS container agent permission to make AWS API calls on your behalf. The task execution IAM role is required depending on the requirements of your task. For more information, see Amazon ECS task execution IAM role in the Amazon Elastic Container Service Developer Guide.",
      },
      {
        title: "Task role ARN",
        value: this.taskDefinition?.taskRoleArn,
        helpText:
          "The short name or full Amazon Resource Name (ARN) of the AWS Identity and Access Management (IAM) role that grants containers in the task permission to call AWS APIs on your behalf. For more information, see Amazon ECS Task Role in the Amazon Elastic Container Service Developer Guide.",
      },
      {
        title: "PID mode",
        value: this.taskDefinition?.pidMode,
        helpText:
          "The process namespace to use for the containers in the task. The valid values are host or task. If host is specified, then all containers within the tasks that specified the host PID mode on the same container instance share the same process namespace with the host Amazon EC2 instance. If task is specified, all containers within the specified task share the same process namespace. If no value is specified, the default is a private namespace. For more information, see PID settings in the Docker run reference.",
      },
      {
        title: "IPC mode",
        value: this.taskDefinition?.ipcMode,
        helpText:
          "The IPC resource namespace to use for the containers in the task. The valid values are host, task, or none. If host is specified, then all containers within the tasks that specified the host IPC mode on the same container instance share the same IPC resources with the host Amazon EC2 instance. If task is specified, all containers within the specified task share the same IPC resources. If none is specified, then IPC resources within the containers of a task are private and not shared with other containers in a task or on the container instance. If no value is specified, then the IPC resource namespace sharing depends on the Docker daemon setting on the container instance. For more information, see IPC settings in the Docker run reference.",
      },
    ];
  }

  calculateCPU(cpu: string | undefined): string {
    if (!cpu) {
      return "N/A";
    }
    return `${parseInt(cpu) / 1024} vCPU`;
  }

  async retrieveTask(): Promise<void> {
    const credentials = await this.credentials();
    if (!credentials) {
      return;
    }

    const client = new ECS({ region: this.region, credentials });
    try {
      const data = await client
        .describeTaskDefinition({ taskDefinition: this.task })
        .promise();

      this.taskDefinition = data.taskDefinition;
      this.tags = data.tags;
    } catch (err) {
      this.errorMessage = err;
    }
  }

  mounted(): void {
    this.retrieveTask();
  }
}
</script>
