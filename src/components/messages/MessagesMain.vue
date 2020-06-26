<template>
  <ResourceMainMenu :entries="entries" resource-name="Messages" />
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import ResourceMainMenu from "@/components/common/ResourceMainMenu.vue";
import { MenuEntry } from "@/components/common/menuEntry";

@Component({ components: { ResourceMainMenu } })
export default class MessagesMain extends Vue {
  readonly entries: MenuEntry[] = [
    {
      target: "/messages/sns_topics",
      label: "SNS Topics",
      subLabel: "Managed messaging service",
      iconUrl:
        "/assets/aws-icons/messages/Amazon-Simple-Notification-Service-SNS.svg",
    },
    {
      target: "/messages/sns_subscriptions",

      label: "SNS Subscriptions",
      subLabel: "Topics subscribers",
      iconUrl:
        "/assets/aws-icons/messages/Amazon-Simple-Notification-Service-SNS_Topic_light-bg.svg",
    },
    {
      target: "/messages/sqs",
      label: "SQS",
      subLabel: "Message queuing service",
      iconUrl:
        "/assets/aws-icons/messages/Amazon-Simple-Queue-Service-SQS_Message_light-bg.svg",
    },
  ];
}
</script>
