<template>
  <gl-tabs theme="blue">
    <gl-tab title="Overview">
      <gl-modal
        modal-id="purge-sqs-modal"
        title="Purge queue"
        no-fade
        :action-primary="purgeSqsButtonProps"
        :action-cancel="cancelProps"
        @primary="purgeSqs"
      >
        Are you sure that you want to purge the queue named<b>{{ queueName }}</b
        >?
      </gl-modal>

      <div class="row justify-content-center">
        <gl-button-group>
          <gl-button
            variant="warning"
            category="secondary"
            v-gl-modal-directive="'purge-sqs-modal'"
            >Purge this queue
          </gl-button>
          <DeleteButtonWithConfirmation
            class="text-center"
            resource-type="queue"
            :resource-id="queueName"
            @primary="deleteSqs"
          />
        </gl-button-group>
      </div>

      <DrawerCards :cards="cards" />

      <h5 class="mt-2">Tags</h5>
      <TagsTable
        :region="sqs.region"
        :resource-id="sqs.queueUrl"
        provider="SQS"
      />
    </gl-tab>

    <gl-tab title="Monitoring">
      <div class="row justify-content-between">
        <CloudwatchWidget
          class="col-12 col-md-6 col-lg-4"
          v-if="sqs"
          :metrics="metricsNumberOfMessagesSent"
          :live-data="false"
          stat="Sum"
          :region="sqs.region"
          :key="sqs.queueUrl + 'numberOfMessagesSent'"
          :legend="{ position: 'hidden' }"
          graph-title="Number of messages sent"
          :label="queueName"
        />
        <CloudwatchWidget
          class="col-12 col-md-6 col-lg-4"
          v-if="sqs"
          :metrics="metricsNumberOfMessagesReceived"
          :live-data="false"
          stat="Sum"
          :region="sqs.region"
          :key="sqs.queueUrl + 'numberOfMessagesReceived'"
          :legend="{ position: 'hidden' }"
          graph-title="Number of messages received"
          :label="queueName"
        />
        <CloudwatchWidget
          class="col-12 col-md-6 col-lg-4"
          v-if="sqs"
          :metrics="metricsApproximateNumberOfMessagesVisible"
          :live-data="false"
          :region="sqs.region"
          :key="sqs.queueUrl + 'approximateNumberOfMessagesVisible'"
          :legend="{ position: 'hidden' }"
          graph-title="Approximate number of messages visible"
          :label="queueName"
        />
      </div>

      <div class="row justify-content-between">
        <CloudwatchWidget
          class="col-12 col-md-6 col-lg-4"
          v-if="sqs"
          :metrics="metricsNumberOfMessagesDeleted"
          :live-data="false"
          stat="Sum"
          :region="sqs.region"
          :key="sqs.queueUrl + 'numberOfMessagesDeleted'"
          :legend="{ position: 'hidden' }"
          graph-title="Number of messages deleted"
          :label="queueName"
        />
        <CloudwatchWidget
          class="col-12 col-md-6 col-lg-4"
          v-if="sqs"
          :metrics="metricsNumberOfEmptyReceives"
          :live-data="false"
          stat="Sum"
          :region="sqs.region"
          :key="sqs.queueUrl + 'numberOfEmptyReceives'"
          :legend="{ position: 'hidden' }"
          graph-title="Number of empty receives"
          :label="queueName"
        />
        <CloudwatchWidget
          class="col-12 col-md-6 col-lg-4"
          v-if="sqs"
          :metrics="metricsApproximateNumberOfMessagesNotVisible"
          :live-data="false"
          :region="sqs.region"
          :key="sqs.queueUrl + 'approximateNumberOfMessagesNotVisible'"
          :legend="{ position: 'hidden' }"
          graph-title="Approximate number of messages not visible"
          :label="queueName"
        />
      </div>

      <div class="row justify-content-between">
        <CloudwatchWidget
          class="col-12 col-md-6 col-lg-4"
          v-if="sqs"
          :metrics="metricsApproximateNumberOfMessagesDelayed"
          :live-data="false"
          stat="Sum"
          :region="sqs.region"
          :key="sqs.queueUrl + 'approximateNumberOfMessagesDelayed'"
          :legend="{ position: 'hidden' }"
          graph-title="Approximate number of messages delayed"
          :label="queueName"
        />
        <CloudwatchWidget
          class="col-12 col-md-6 col-lg-4"
          v-if="sqs"
          :metrics="metricsSentMessageSize"
          :live-data="false"
          stat="Average"
          :region="sqs.region"
          :key="sqs.queueUrl + 'sentMessageSize'"
          :legend="{ position: 'hidden' }"
          graph-title="Sent message size"
          :label="queueName"
          :y-axis="{ name: 'Bytes' }"
        />
        <CloudwatchWidget
          class="col-12 col-md-6 col-lg-4"
          v-if="sqs"
          :metrics="metricsApproximateAgeOfOldestMessage"
          :live-data="false"
          stat="Maximum"
          :region="sqs.region"
          :key="sqs.queueUrl + 'approximateAgeOfOldestMessage'"
          :legend="{ position: 'hidden' }"
          graph-title="Approximate age of oldest message"
          :label="queueName"
          :y-axis="{ name: 'Seconds' }"
        />
      </div>
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
} from "@gitlab/ui";
import SQSClient from "aws-sdk/clients/sqs";
import { Component, Prop } from "vue-property-decorator";
import TagsTable from "@/components/common/TagsTable.vue";
import { QueueWithRegion } from "@/components/messages/SQS/sqs";
import CloudwatchWidget from "@/components/cloudwatch/CloudwatchWidget.vue";
import { Metric } from "aws-sdk/clients/cloudwatch";
import DrawerCards from "@/components/common/DrawerCards.vue";
import { CardContent } from "@/components/common/cardContent";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import DeleteButtonWithConfirmation from "@/components/common/DeleteButtonWithConfirmation.vue";

@Component({
  components: {
    CloudwatchWidget,
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
    DrawerCards,
    DeleteButtonWithConfirmation,
  },
  directives: { "gl-modal-directive": GlModalDirective },
})
export default class SQS extends DaintreeComponent {
  @Prop(Object) readonly sqs!: QueueWithRegion;

  purgeSqsButtonProps = {
    text: "Purge queue",
  };

  cancelProps = {
    text: "Cancel",
  };

  get cards(): CardContent[] {
    return [
      {
        title: "Number of messages",
        value: this.sqs.ApproximateNumberOfMessages,
        helpText:
          "The approximate number of messages available for retrieval from the queue.",
      },
      {
        title: "Messages delayed",
        value: this.sqs.ApproximateNumberOfMessagesDelayed,
        helpText:
          "The approximate number of messages in the queue that are delayed and not available for reading immediately. This can happen when the queue is configured as a delay queue or when a message has been sent with a delay parameter.",
      },
      {
        title: "Messages not visible",
        value: this.sqs.ApproximateNumberOfMessagesNotVisible,
        helpText:
          "The approximate number of messages that are in flight. Messages are considered to be in flight if they have been sent to a client but have not yet been deleted or have not yet reached the end of their visibility window.",
      },
      {
        title: "Deduplication?",
        value: this.sqs.ContentBasedDeduplication,
        helpText: "Is content-based deduplication enabled for the queue?",
      },
      {
        title: "Created",
        value: this.sqs.CreatedTimestamp
          ? this.standardDateFromUnixSecondsString(this.sqs.CreatedTimestamp)
          : undefined,
      },
      {
        title: "Last modified",
        value: this.sqs.LastModifiedTimestamp
          ? this.standardDateFromUnixSecondsString(
              this.sqs.LastModifiedTimestamp
            )
          : undefined,
      },
      {
        title: "Retention period",
        value: `${this.sqs.MessageRetentionPeriod} seconds`,
        helpText:
          "The length of time, in seconds, for which Amazon SQS retains a message.",
      },
      {
        title: "Wait time",
        value: `${this.sqs.ReceiveMessageWaitTimeSeconds} seconds`,
        helpText:
          "The length of time, in seconds, for which the ReceiveMessage action waits for a message to arrive. ",
      },
      {
        title: "Visibility",
        value: `${this.sqs.VisibilityTimeout} seconds`,
        helpText: "The visibility timeout for the queue",
      },
    ];
  }

  get metricsNumberOfMessagesSent(): Metric[] {
    return [
      {
        Namespace: "AWS/SQS",
        MetricName: "NumberOfMessagesSent",
        Dimensions: [{ Name: "QueueName", Value: this.queueName }],
      },
    ];
  }

  get metricsNumberOfMessagesReceived(): Metric[] {
    return [
      {
        Namespace: "AWS/SQS",
        MetricName: "NumberOfMessagesReceived",
        Dimensions: [{ Name: "QueueName", Value: this.queueName }],
      },
    ];
  }

  get metricsApproximateNumberOfMessagesVisible(): Metric[] {
    return [
      {
        Namespace: "AWS/SQS",
        MetricName: "ApproximateNumberOfMessagesVisible",
        Dimensions: [{ Name: "QueueName", Value: this.queueName }],
      },
    ];
  }

  get metricsNumberOfMessagesDeleted(): Metric[] {
    return [
      {
        Namespace: "AWS/SQS",
        MetricName: "NumberOfMessagesDeleted",
        Dimensions: [{ Name: "QueueName", Value: this.queueName }],
      },
    ];
  }

  get metricsNumberOfEmptyReceives(): Metric[] {
    return [
      {
        Namespace: "AWS/SQS",
        MetricName: "NumberOfEmptyReceives",
        Dimensions: [{ Name: "QueueName", Value: this.queueName }],
      },
    ];
  }

  get metricsApproximateNumberOfMessagesNotVisible(): Metric[] {
    return [
      {
        Namespace: "AWS/SQS",
        MetricName: "ApproximateNumberOfMessagesNotVisible",
        Dimensions: [{ Name: "QueueName", Value: this.queueName }],
      },
    ];
  }

  get metricsApproximateNumberOfMessagesDelayed(): Metric[] {
    return [
      {
        Namespace: "AWS/SQS",
        MetricName: "ApproximateNumberOfMessagesDelayed",
        Dimensions: [{ Name: "QueueName", Value: this.queueName }],
      },
    ];
  }

  get metricsSentMessageSize(): Metric[] {
    return [
      {
        Namespace: "AWS/SQS",
        MetricName: "SentMessageSize",
        Dimensions: [{ Name: "QueueName", Value: this.queueName }],
      },
    ];
  }

  get metricsApproximateAgeOfOldestMessage(): Metric[] {
    return [
      {
        Namespace: "AWS/SQS",
        MetricName: "ApproximateAgeOfOldestMessage",
        Dimensions: [{ Name: "QueueName", Value: this.queueName }],
      },
    ];
  }

  get queueName(): string {
    if (!this.sqs || !this.sqs.queueUrl) {
      return "";
    }

    return this.sqs.queueUrl.split("/")[
      this.sqs.queueUrl.split("/").length - 1
    ];
  }

  deleteSqs() {
    if (!this.sqs.queueUrl) {
      return;
    }

    const SQS = new SQSClient({
      region: this.sqs.region,
      credentials: this.$store.getters["sts/credentials"],
    });

    SQS.deleteQueue({ QueueUrl: this.sqs.queueUrl }, (err) => {
      if (err) {
        this.showError(err.message, "deleteSqs");
      } else {
        this.hideErrors("deleteSqs");
        this.showAlert({
          variant: "info",
          text: "Deleted queue with URL " + this.sqs.queueUrl,
          key: "deletingSqs",
          resourceId: this.sqs.queueUrl,
        });
        this.$emit("deleted");
      }
    });
  }

  purgeSqs() {
    if (!this.sqs.queueUrl) {
      return;
    }

    const SQS = new SQSClient({
      region: this.sqs.region,
      credentials: this.$store.getters["sts/credentials"],
    });

    SQS.purgeQueue({ QueueUrl: this.sqs.queueUrl }, (err) => {
      if (err) {
        this.showError(err.message, "purgeSqs");
      } else {
        this.hideErrors("purgeSqs");
        this.showAlert({
          variant: "info",
          text: "Deleted queue with URL " + this.sqs.queueUrl,
          key: "purgingSqs",
          resourceId: this.sqs.queueUrl,
        });
      }
    });
  }
}
</script>
