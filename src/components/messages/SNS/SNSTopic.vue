<template>
  <gl-tabs theme="blue">
    <gl-tab title="Overview">
      <gl-modal
        modal-id="delete-sns-modal"
        title="Delete topic"
        no-fade
        :action-primary="deleteSnsButtonProps"
        :action-cancel="cancelProps"
        @primary="deleteSns"
      >
        Are you sure that you want to delete the topic named
        <b>{{ sns.topicArn.split(":")[sns.topicArn.split(":").length - 1] }}</b
        >?
      </gl-modal>
      <div class="row justify-content-center">
        <gl-button-group>
          <gl-button
            variant="danger"
            category="secondary"
            v-gl-modal-directive="'delete-sns-modal'"
            >Delete this topic
          </gl-button>
        </gl-button-group>
      </div>

      <div class="row justify-content-around mt-2">
        <gl-card class="col-3" title="Number of subscriptions">
          {{ sns.SubscriptionsConfirmed }}
        </gl-card>

        <gl-card class="col-3" title="Subscriptions pending">
          {{ sns.SubscriptionsPending }}
        </gl-card>
        <gl-card class="col-3" title="Subscriptions deleted">
          {{ sns.SubscriptionsDeleted }}
        </gl-card>
      </div>
      <div class="row justify-content-around mt-3">
        <gl-card class="col-3" title="Display name">
          {{ sns.DisplayName }}
        </gl-card>
        <gl-card class="col-3" title="Arn">
          {{ sns.topicArn }}
        </gl-card>
        <gl-card class="col-3" title="Owner">
          {{ sns.Owner }}
        </gl-card>
      </div>

      <h5 class="mt-2">Tags</h5>
      <!--I use key to force a rerender, I should study Vue reactivity better ¯\_(ツ)_/¯ -->
      <TagsTable
        :key="sns.topicArn"
        :region="sns.region"
        :resource-id="sns.topicArn"
        provider="SNS"
      />
    </gl-tab>

    <gl-tab title="Subscriptions" @click="listSubscriptions">
      <gl-alert
        v-if="subscriptionsState === 'error'"
        variant="danger"
        :dismissible="false"
        >{{ subscriptionsError }}
      </gl-alert>
      <gl-skeleton-loading v-if="subscriptionsState === 'loading'" />

      <gl-table :items="subscriptions" :fields="subscriptionsFields">
        <template v-slot:cell(SubscriptionArn)="data">
          <router-link
            :to="`/messages/sns_subscriptions?subscriptionId=${data.value}`"
          >
            {{ data.value }}
          </router-link>
        </template>
      </gl-table>

      <gl-empty-state
        v-if="subscriptionsState === 'empty'"
        title="No related subscriptions"
        svg-path="/assets/undraw_empty_xct9.svg"
        description="Daintree hasn't found anything subscribed to this topic!"
        compact
      />
    </gl-tab>

    <gl-tab title="Access Policy">
      <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
        This policy defines who can access your topic. By default, only the
        topic owner can publish or subscribe to the topic.
        <a
          href="https://docs.aws.amazon.com/sns/latest/dg/sns-access-policy-use-cases.html"
          target="_blank"
          >More info on the AWS Guide<gl-icon name="external-link" />.</a
        >
      </gl-alert>

      <pre><code v-html="highlightedAccessPolicy" /></pre>
    </gl-tab>

    <gl-tab title="Delivery retry policy (HTTP/S)">
      <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
        This policy defines how Amazon SNS retries failed deliveries to HTTP/S
        endpoints.
        <a
          href="https://docs.aws.amazon.com/sns/latest/dg/DeliveryPolicies.html"
          target="_blank"
          >More info on the AWS Guide<gl-icon name="external-link" />.</a
        >
      </gl-alert>

      <pre><code v-html="highlightedEffectiveDeliveryPolicy" /></pre>
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
import { Component, Prop, Watch } from "vue-property-decorator";
import { Formatters } from "@/mixins/formatters";
import TagsTable from "@/components/common/TagsTable.vue";
import { mixins } from "vue-class-component";
import Notifications from "@/mixins/notifications";
import { TopicWithRegion } from "@/components/messages/SNS/sns";

import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import { SubscriptionsList } from "aws-sdk/clients/sns";
hljs.registerLanguage("json", json);

@Component({
  components: {
    TagsTable,
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
export default class SNSTopic extends mixins(Formatters, Notifications) {
  @Prop(Object) readonly sns!: TopicWithRegion;

  deleteSnsButtonProps = {
    text: "Delete topic"
  };

  cancelProps = {
    text: "Cancel"
  };

  get highlightedAccessPolicy() {
    if (!this.sns.Policy) {
      return "{}";
    }

    //Beautify the JSON
    const jsonObj = JSON.parse(this.sns.Policy);
    const jsonString = JSON.stringify(jsonObj, null, "\t");

    return hljs.highlight("json", jsonString).value;
  }

  get highlightedEffectiveDeliveryPolicy() {
    if (!this.sns.EffectiveDeliveryPolicy) {
      return "{}";
    }

    //Beautify the JSON
    const jsonObj = JSON.parse(this.sns.EffectiveDeliveryPolicy);
    const jsonString = JSON.stringify(jsonObj, null, "\t");

    return hljs.highlight("json", jsonString).value;
  }

  //Subscriptions tab
  subscriptions: SubscriptionsList | undefined = [];
  subscriptionsState: "loading" | "loaded" | "empty" | "error" = "loading";
  subscriptionsError: string | undefined;
  subscriptionsFields = [
    {
      key: "SubscriptionArn",
      label: "ID",
      formatter: (value: string) =>
        value.split(":")[value.split(":").length - 1],
      sortable: true
    },
    {
      key: "Protocol",
      sortable: true
    },
    {
      key: "Endpoint",
      sortable: true
    },
    "Owner"
  ];

  listSubscriptions() {
    if (!this.sns.topicArn) {
      return;
    }

    this.subscriptionsState = "loading";
    this.subscriptions = [];
    this.subscriptionsError = "";

    const SNS = new AWS.SNS({ region: this.sns.region });

    SNS.listSubscriptionsByTopic(
      { TopicArn: this.sns.topicArn },
      (err, data) => {
        if (err) {
          this.subscriptionsError = err.message;
          this.subscriptionsState = "error";
        } else {
          this.subscriptions = data.Subscriptions;
          this.subscriptionsError = undefined;
          this.subscriptionsState =
            this.subscriptions === undefined || this.subscriptions.length === 0
              ? "empty"
              : "loaded";
        }
      }
    );
  }

  deleteSns() {
    if (!this.sns.topicArn) {
      return;
    }

    const SNS = new AWS.SNS({ region: this.sns.region });

    SNS.deleteTopic({ TopicArn: this.sns.topicArn }, err => {
      if (err) {
        this.showError(err.message, "deleteSns");
      } else {
        this.hideErrors("deleteSns");
        this.showAlert({
          variant: "info",
          text: "Deleted topic with ARN " + this.sns.topicArn,
          key: "deletingSns",
          resourceId: this.sns.topicArn
        });
        this.$emit("deleted");
      }
    });
  }

  //This happens while the user clicks on a row of the table while the sidebar is open.

  @Watch("sns")
  onSnsChanged() {
    this.listSubscriptions();
  }
}
</script>

<style scoped></style>
