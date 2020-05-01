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
        Are you sure that you want to purge the queue named
        <b>{{ sqs.queueUrl.split("/")[sqs.queueUrl.split("/").length - 1] }}</b
        >?
      </gl-modal>

      <gl-modal
        modal-id="delete-sqs-modal"
        title="Delete queue"
        no-fade
        :action-primary="deleteSqsButtonProps"
        :action-cancel="cancelProps"
        @primary="deleteSqs"
      >
        Are you sure that you want to delete the queue named
        <b>{{ sqs.queueUrl.split("/")[sqs.queueUrl.split("/").length - 1] }}</b
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
          <gl-button
            variant="danger"
            category="secondary"
            v-gl-modal-directive="'delete-sqs-modal'"
            >Delete this queue
          </gl-button>
        </gl-button-group>
      </div>

      <div class="row justify-content-around mt-2">
        <gl-card class="col-3" title="Number of messages">
          {{ sqs.ApproximateNumberOfMessages }}
        </gl-card>

        <gl-card class="col-3" title="Messages delayed">
          {{ sqs.ApproximateNumberOfMessagesDelayed }}
        </gl-card>
        <gl-card class="col-3" title="Messages not visible">
          {{ sqs.ApproximateNumberOfMessagesNotVisible }}
        </gl-card>
      </div>
      <div class="row justify-content-around mt-3">
        <gl-card class="col-3" title="Deduplication?">
          {{ sqs.ContentBasedDeduplication }}
        </gl-card>
        <gl-card class="col-3" title="Created">
          {{ sqs.CreatedTimestamp | standardDateFromUnixSecondsString }}
        </gl-card>
        <gl-card class="col-3" title="Last modified">
          {{ sqs.LastModifiedTimestamp | standardDateFromUnixSecondsString }}
        </gl-card>
      </div>

      <div class="row justify-content-around mt-3">
        <gl-card class="col-3" title="Retention period">
          {{ sqs.MessageRetentionPeriod }} seconds
        </gl-card>
        <gl-card class="col-3" title="Wait time">
          {{ sqs.ReceiveMessageWaitTimeSeconds }} seconds
        </gl-card>
        <gl-card class="col-3" title="Visibility">
          {{ sqs.VisibilityTimeout }} seconds
        </gl-card>
      </div>

      <h5 class="mt-2">Tags</h5>
      <!--I use key to force a rerender, I should study Vue reactivity better ¯\_(ツ)_/¯ -->
      <TagsTable
        :key="sqs.QueueArn"
        :region="sqs.region"
        :resource-id="sqs.queueUrl"
        provider="SQS"
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
  GlButtonGroup
} from "@gitlab/ui";
import SQSClient from "aws-sdk/clients/sqs";
import { Component, Prop } from "vue-property-decorator";
import { Formatters } from "@/mixins/formatters";
import TagsTable from "@/components/common/TagsTable.vue";
import { mixins } from "vue-class-component";
import Notifications from "@/mixins/notifications";
import { QueueWithRegion } from "@/components/messages/SQS/sqs";

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
    GlButtonGroup
  },
  directives: { "gl-modal-directive": GlModalDirective }
})
export default class SQS extends mixins(Formatters, Notifications) {
  @Prop(Object) readonly sqs!: QueueWithRegion;

  deleteSqsButtonProps = {
    text: "Delete queue"
  };

  purgeSqsButtonProps = {
    text: "Purge queue"
  };

  cancelProps = {
    text: "Cancel"
  };

  deleteSqs() {
    if (!this.sqs.queueUrl) {
      return;
    }

    const SQS = new SQSClient({
      region: this.sqs.region,
      credentials: this.$store.getters["sts/credentials"]
    });

    SQS.deleteQueue({ QueueUrl: this.sqs.queueUrl }, err => {
      if (err) {
        this.showError(err.message, "deleteSqs");
      } else {
        this.hideErrors("deleteSqs");
        this.showAlert({
          variant: "info",
          text: "Deleted queue with URL " + this.sqs.queueUrl,
          key: "deletingSqs",
          resourceId: this.sqs.queueUrl
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
      credentials: this.$store.getters["sts/credentials"]
    });

    SQS.purgeQueue({ QueueUrl: this.sqs.queueUrl }, err => {
      if (err) {
        this.showError(err.message, "purgeSqs");
      } else {
        this.hideErrors("purgeSqs");
        this.showAlert({
          variant: "info",
          text: "Deleted queue with URL " + this.sqs.queueUrl,
          key: "purgingSqs",
          resourceId: this.sqs.queueUrl
        });
      }
    });
  }
}
</script>

<style scoped></style>
