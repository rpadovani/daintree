<template>
  <div>
    <Header v-if="!onlyContent" :hide-refresher="true" />
    <div class="container mt-2">
      <h3>Messages resources</h3>
      <div class="row mt-2">
        <div class="col-12 col-sm-6 col-lg-3">
          <gl-avatar-link to="/messages/sns_topics">
            <gl-avatar-labeled
              label="SNS Topics"
              sub-label="Managed messaging service"
              src="/assets/aws-icons/messages/Amazon-Simple-Notification-Service-SNS.svg"
              shape="rect"
              :size="32"
            >
            </gl-avatar-labeled>
          </gl-avatar-link>
        </div>
        <div class="col-12 col-sm-6 col-lg-3">
          <gl-avatar-link to="/messages/sns_subscriptions">
            <gl-avatar-labeled
              label="SNS Subscriptions"
              sub-label="Topics subscribers"
              src="/assets/aws-icons/messages/Amazon-Simple-Notification-Service-SNS_Topic_light-bg.svg"
              shape="rect"
              :size="32"
            >
            </gl-avatar-labeled>
          </gl-avatar-link>
        </div>
        <div class="col-12 col-sm-6 col-lg-3">
          <gl-avatar-link to="/messages/sqs">
            <gl-avatar-labeled
              label="SQS"
              sub-label="Message queuing service"
              src="/assets/aws-icons/messages/Amazon-Simple-Queue-Service-SQS_Message_light-bg.svg"
              shape="rect"
              :size="32"
            >
            </gl-avatar-labeled>
          </gl-avatar-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { GlAvatarLabeled, GlAvatarLink } from "@gitlab/ui";
import { Component, Prop, Vue } from "vue-property-decorator";
import Header from "@/components/Header/Header.vue";

@Component({
  components: {
    Header,
    GlAvatarLabeled,
    GlAvatarLink,
  },
})
export default class MessagesMain extends Vue {
  @Prop(Boolean) readonly onlyContent: boolean | undefined;
}
</script>

<style scoped></style>
