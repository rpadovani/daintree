<template>
  <ResourceMainMenu :entries="entries" resource-name="ECS" />
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import ResourceMainMenu from "@/components/common/ResourceMainMenu.vue";
import { MenuEntry } from "@/components/common/menuEntry";

@Component({
  components: {
    ResourceMainMenu,
  },
})
export default class ECSMain extends Vue {
  readonly entries: MenuEntry[] = [
    {
      target: "/ecs/tasksDefinitions",
      label: "Tasks definitions",
      subLabel: "Program your containers",
      iconUrl:
        "/assets/aws-icons/ecs/Amazon-Elastic-Container-Service_Task_light-bg.svg",
    },
    {
      target: "/ecs/clusters",
      label: "Clusters",
      subLabel: "Logical group of tasks",
      iconUrl: "/assets/aws-icons/ecs/EC2-instance-container_light-bg.svg",
    },
  ];
}
</script>
