<template>
  <ResourceMainMenu :entries="entries" resource-name="EC2" />
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import ResourceMainMenu from "@/components/common/ResourceMainMenu.vue";
import { MenuEntry } from "@/components/common/menuEntry";

@Component({ components: { ResourceMainMenu } })
export default class EC2Main extends Vue {
  readonly entries: MenuEntry[] = [
    {
      target: "/ec2/instances",
      label: "Instances",
      subLabel: "Resizable compute capacity",
      iconUrl: "/assets/aws-icons/ec2/Amazon-EC2_Instances_light-bg.svg",
    },

    {
      target: "/ec2/loadBalancers",
      label: "Load balancers",
      subLabel: "Incoming traffic distribution",
      iconUrl: "/assets/aws-icons/ec2/Elastic-Load-Balancing.svg",
    },
    {
      target: "/ec2/targetGroups",
      label: "Target groups",
      subLabel: "Route requests to targets",
    },
    {
      target: "/ec2/keyPairs",
      label: "Key pairs",
      subLabel: "SSH to your instances",
      iconUrl: "assets/aws-icons/ec2/AWS-Key-Management-Service.svg",
    },
    {
      target: "/ec2/volumes",
      label: "EBS volumes",
      subLabel: "Block storage service",
      iconUrl:
        "assets/aws-icons/ec2/Amazon-Elastic-Block-Store-EBS_Volume_light-bg.svg",
    },
    {
      target: "/ec2/snapshots",
      label: "EBS snapshots",
      subLabel: "Backup your EBS",
      iconUrl:
        "assets/aws-icons/ec2/Amazon-Elastic-Block-Store-EBS_Snapshot_light-bg.svg",
    },
  ];
}
</script>
