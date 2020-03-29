<template>
  <gl-tabs theme="blue">
    <gl-tab title="Overview">
      <gl-modal
        modal-id="delete-sns-modal"
        title="Delete subscription"
        no-fade
        :action-primary="deleteSnsButtonProps"
        :action-cancel="cancelProps"
        @primary="deleteSns"
      >
        Are you sure that you want to delete the subscription named
        <b>{{
          sns.subscriptionArn.split(":")[
            sns.subscriptionArn.split(":").length - 1
          ]
        }}</b
        >?
      </gl-modal>
      <div class="row justify-content-center">
        <gl-button-group>
          <gl-button
            variant="danger"
            category="secondary"
            v-gl-modal-directive="'delete-sns-modal'"
            >Delete this subscription
          </gl-button>
        </gl-button-group>
      </div>

      <div class="row justify-content-around mt-2">
        <gl-card class="col-3" title="Endpoint">
          {{ sns.Endpoint }}
        </gl-card>

        <gl-card class="col-3" title="Protocol">
          {{ sns.Protocol }}
        </gl-card>

        <gl-card class="col-3" title="Pending confirmation?">
          {{ sns.PendingConfirmation }}
        </gl-card>
      </div>
      <div class="row justify-content-around mt-3">
        <gl-card class="col-3" title="Raw delivery?">
          {{ sns.RawMessageDelivery }}
        </gl-card>
        <gl-card class="col-3" title="Topic Arn">
          {{ sns.TopicArn }}
        </gl-card>
        <gl-card class="col-3" title="Owner">
          {{ sns.Owner }}
        </gl-card>
      </div>
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
  GlButton,
  GlModal,
  GlModalDirective,
  GlButtonGroup,
  GlIcon
} from "@gitlab/ui";
import AWS from "aws-sdk";
import { Component, Prop } from "vue-property-decorator";
import { Formatters } from "@/mixins/formatters";
import { mixins } from "vue-class-component";
import Notifications from "@/mixins/notifications";
import { SubscriptionWithRegion } from "@/components/messages/SNS/sns";

import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
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
    GlButton,
    GlModal,
    GlButtonGroup,
    GlIcon
  },
  directives: { "gl-modal-directive": GlModalDirective }
})
export default class SNSSubscription extends mixins(Formatters, Notifications) {
  @Prop(Object) readonly sns!: SubscriptionWithRegion;

  deleteSnsButtonProps = {
    text: "Delete subscription"
  };

  cancelProps = {
    text: "Cancel"
  };

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

    const SNS = new AWS.SNS({ region: this.sns.region });

    SNS.unsubscribe({ SubscriptionArn: this.sns.subscriptionArn }, err => {
      if (err) {
        this.showError(err.message, "deleteSns");
      } else {
        this.hideErrors("deleteSns");
        this.showAlert({
          variant: "info",
          text: "Deleted subscription with ARN " + this.sns.subscriptionArn,
          key: "deletingSns",
          resourceId: this.sns.subscriptionArn
        });
        this.$emit("deleted");
      }
    });
  }
}
</script>

<style scoped></style>
