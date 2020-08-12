<template>
  <gl-tabs theme="blue">
    <gl-tab title="Overview">
      <DeleteButtonWithConfirmation
        class="text-center"
        resource-type="subscription"
        :resource-id="subscriptionName"
        @primary="deleteSns"
      />

      <DrawerCards :cards="cards" />
    </gl-tab>

    <gl-tab title="Delivery Policy">
      <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
        Amazon SNS defines a delivery policy for each delivery protocol. The
        delivery policy defines how Amazon SNS retries the delivery of messages
        when server-side errors occur (when the system that hosts the subscribed
        endpoint becomes unavailable). When the delivery policy is exhausted,
        Amazon SNS stops retrying the delivery and discards the message—unless a
        dead-letter queue is attached to the subscription.
        <a
          href="https://docs.aws.amazon.com/sns/latest/dg/sns-message-delivery-retries.html"
          target="_blank"
          >More info on the AWS Guide<gl-icon name="external-link" />.</a
        >
      </gl-alert>

      <pre
        v-if="sns.DeliveryPolicy"
      ><code v-html="highlightedDeliveryPolicy" /></pre>
      <gl-empty-state
        v-else
        class="mt-5"
        title="No delivery policy found"
        svg-path="/assets/undraw_files1_9ool.svg"
        description="Daintree hasn't found any delivery policy associated to this subscription"
        compact
      />
    </gl-tab>

    <gl-tab title="Filter policy">
      <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
        A subscription filter policy allows you to specify attribute names and
        assign a list of values to each attribute name.
        <a
          href="https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html"
          target="_blank"
          >More info on the AWS Guide<gl-icon name="external-link" />.</a
        >
      </gl-alert>

      <pre
        v-if="sns.FilterPolicy"
      ><code v-html="highlightedFilterPolicy" /></pre>
      <gl-empty-state
        v-else
        class="mt-5"
        title="No filter policy found"
        svg-path="/assets/undraw_files1_9ool.svg"
        description="Daintree hasn't found any filter policy associated to this subscription"
        compact
      />
    </gl-tab>

    <gl-tab title="Redrive policy">
      <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
        You can assign a redrive policy to Amazon SNS subscriptions by
        specifying the Amazon SQS queue that captures messages that can't be
        delivered to subscribers successfully.
        <a
          href="https://docs.aws.amazon.com/sns/latest/dg/sns-dead-letter-queues.html"
          target="_blank"
          >More info on the AWS Guide<gl-icon name="external-link" />.</a
        >
      </gl-alert>

      <pre
        v-if="sns.RedrivePolicy"
      ><code v-html="highlightedRedrivePolicy" /></pre>
      <gl-empty-state
        v-else
        class="mt-5"
        title="No redrive policy found"
        svg-path="/assets/undraw_files1_9ool.svg"
        description="Daintree hasn't found any redrive policy associated to this subscription"
        compact
      />
    </gl-tab>
  </gl-tabs>
</template>

<script lang="ts">
import {
  GlEmptyState,
  GlSkeletonLoading,
  GlTab,
  GlTable,
  GlTabs,
  GlCard,
  GlAlert,
  GlIcon,
} from "@gitlab/ui";
import SNSClient from "aws-sdk/clients/sns";
import { Component, Prop } from "vue-property-decorator";
import { Formatters } from "@/mixins/formatters";
import { mixins } from "vue-class-component";
import Notifications from "@/mixins/notifications";
import { SubscriptionWithRegion } from "@/components/messages/SNS/sns";

import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import DrawerCards from "@/components/common/DrawerCards.vue";
import { CardContent } from "@/components/common/cardContent";
import DeleteButtonWithConfirmation from "@/components/common/DeleteButtonWithConfirmation.vue";
hljs.registerLanguage("json", json);

@Component({
  components: {
    GlTabs,
    GlTab,
    GlTable,
    GlEmptyState,
    GlSkeletonLoading,
    GlCard,
    GlAlert,
    GlIcon,
    DrawerCards,
    DeleteButtonWithConfirmation,
  },
})
export default class SNSSubscription extends mixins(Formatters, Notifications) {
  @Prop(Object) readonly sns!: SubscriptionWithRegion;

  get subscriptionName(): string {
    if (!this.sns.subscriptionArn) {
      return "";
    }

    const split = this.sns.subscriptionArn.split(":");
    return split[split.length - 1];
  }

  get endpointCard(): CardContent {
    if (this.sns.Protocol === "sqs") {
      return {
        title: "Endpoint",
        value: this.sns.Endpoint,
        linkTo: `/messages/sqs?arn=${this.sns.Endpoint}`,
      };
    }

    return {
      title: "Endpoint",
      value: this.sns.Endpoint,
    };
  }

  get cards(): CardContent[] {
    return [
      {
        ...this.endpointCard,
        helpText:
          "The endpoint that you want to receive notifications. Endpoints vary by protocol.",
      },
      { title: "Protocol", value: this.sns.Protocol },
      {
        title: "Pending confirmation?",
        value: this.sns.PendingConfirmation,
        helpText:
          "true if the subscription hasn't been confirmed. To confirm a pending subscription, call the ConfirmSubscription action with a confirmation token.",
      },
      {
        title: "Raw delivery?",
        value: this.sns.RawMessageDelivery,
        helpText:
          "true if raw message delivery is enabled for the subscription. Raw messages are free of JSON formatting and can be sent to HTTP/S and Amazon SQS endpoints.",
      },
      {
        title: "Topic Arn",
        value: this.sns.TopicArn,
        helpText: "The topic ARN that the subscription is associated with.",
      },
      {
        title: "Owner",
        value: this.sns.Owner,
        helpText: "The AWS account ID of the subscription's owner.",
      },
    ];
  }

  get highlightedDeliveryPolicy() {
    if (!this.sns.EffectiveDeliveryPolicy) {
      return "{}";
    }

    //Beautify the JSON
    const jsonObj = JSON.parse(this.sns.EffectiveDeliveryPolicy);
    const jsonString = JSON.stringify(jsonObj, null, "\t");

    return hljs.highlight("json", jsonString).value;
  }

  get highlightedFilterPolicy() {
    if (!this.sns.FilterPolicy) {
      return "{}";
    }

    //Beautify the JSON
    const jsonObj = JSON.parse(this.sns.FilterPolicy);
    const jsonString = JSON.stringify(jsonObj, null, "\t");

    return hljs.highlight("json", jsonString).value;
  }

  get highlightedRedrivePolicy() {
    if (!this.sns.RedrivePolicy) {
      return "{}";
    }

    //Beautify the JSON
    const jsonObj = JSON.parse(this.sns.RedrivePolicy);
    const jsonString = JSON.stringify(jsonObj, null, "\t");

    return hljs.highlight("json", jsonString).value;
  }

  deleteSns() {
    if (!this.sns.subscriptionArn) {
      return;
    }

    const SNS = new SNSClient({
      region: this.sns.region,
      credentials: this.$store.getters["sts/credentials"],
    });

    SNS.unsubscribe({ SubscriptionArn: this.sns.subscriptionArn }, (err) => {
      if (err) {
        this.showError(err.message, "deleteSns");
      } else {
        this.hideErrors("deleteSns");
        this.showAlert({
          variant: "info",
          text: "Deleted subscription with ARN " + this.sns.subscriptionArn,
          key: "deletingSns",
          resourceId: this.sns.subscriptionArn,
        });
        this.$emit("deleted");
      }
    });
  }
}
</script>
