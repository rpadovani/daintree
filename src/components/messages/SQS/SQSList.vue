<template>
  <div>
    <gl-drawer
      :open="drawerOpened && selectedResourceKey !== ''"
      @close="close"
      style="min-width: 80%"
    >
      <template #header>{{ selectedResourceTitle }}</template>

      <SQS :sqs="selectedResource" v-on:deleted="close" />
    </gl-drawer>

    <div class="container-fluid">
      <div
        class="row justify-content-between mt-3 mb-2 ml-2 mr-2"
        v-if="resourcesAsList.length > 0"
      >
        <gl-form-input
          class="col-12 col-sm-8 col-lg-9 mb-3 mb-sm-0"
          id="filter"
          v-model="filter"
          placeholder="Type to filter..."
        />

        <gl-button
          icon="plus"
          category="secondary"
          variant="success"
          class="col-12 col-sm-3 col-lg-2"
          to="/messages/sqs/new"
          >Create new queue
        </gl-button>
      </div>
      <gl-table
        :items="resourcesAsList"
        :fields="fields"
        :filter="filter"
        :busy="isLoading"
        ref="resourcesTable"
        :primary-key="resourceUniqueKey"
        selectable
        select-mode="single"
        @row-selected="onRowSelected"
        v-show="resourcesAsList.length > 0"
        show-empty
        hover
      >
        <template v-slot:emptyfiltered="">
          <gl-empty-state
            class="mt-5"
            title="No resource matching your search!"
            svg-path="/assets/undraw_file_searching_duff.svg"
            description="Remove the filter above to see all your resources"
            compact
          />
        </template>

        <template v-slot:cell(region)="data">
          <RegionText :region="data.value" />
        </template>
        <template v-slot:cell(ApproximateNumberOfMessages)="data">
          <gl-loading-icon
            inline
            v-if="!data.value && data.value !== 0"
          ></gl-loading-icon>
          {{ data.value }}
        </template>
        <template v-slot:cell(ApproximateNumberOfMessagesNotVisible)="data">
          <gl-loading-icon
            inline
            v-if="!data.value && data.value !== 0"
          ></gl-loading-icon>
          {{ data.value }}
        </template>
      </gl-table>

      <div class="container">
        <gl-skeleton-loading
          class="mt-5"
          v-if="isLoading && resourcesAsList.length < 1"
        />

        <gl-empty-state
          class="mt-5"
          v-if="!isLoading && resourcesAsList.length === 0"
          title="No queue found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <gl-button icon="plus" variant="success" to="/messages/sqs/new"
              >Create new queue
            </gl-button>
            <gl-button
              category="secondary"
              variant="success"
              class="ml-2"
              v-gl-modal-directive="'region-modal-id'"
              >Change selected regions
            </gl-button>
          </template>
        </gl-empty-state>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ListQueuesRequest } from "aws-sdk/clients/sqs";
import RegionText from "@/components/common/RegionText.vue";
import {
  GlButton,
  GlDrawer,
  GlEmptyState,
  GlFormInput,
  GlIcon,
  GlLoadingIcon,
  GlModalDirective,
  GlSkeletonLoading,
  GlTable,
} from "@gitlab/ui";
import Component from "vue-class-component";
import StateText from "@/components/common/StateText.vue";
import SQS from "@/components/messages/SQS/SQS.vue";
import { QueueWithRegion } from "@/components/messages/SQS/sqs";
import { SqsComponent } from "@/components/messages/SQS/sqsComponent";

@Component({
  components: {
    StateText,
    GlTable,
    RegionText,
    GlIcon,
    GlDrawer,
    SQS,
    GlButton,
    GlFormInput,
    GlSkeletonLoading,
    GlEmptyState,
    GlLoadingIcon,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
  },
})
export default class SQSList extends SqsComponent<QueueWithRegion, "queueUrl"> {
  resourceName = "queue";
  canCreate = true;
  resourceUniqueKey: "queueUrl" = "queueUrl";

  fields = [
    {
      key: "queueUrl",
      label: "Queue Name",
      sortable: true,
      formatter: this.getQueueNameFromUrl,
    },
    {
      key: "fifo",
      label: "Queue Type",
      formatter: (value: never, key: never, item: QueueWithRegion) =>
        item.queueUrl?.endsWith(".fifo") ? "FIFO" : "Standard",
    },
    { key: "region", sortable: true },
    {
      key: "ApproximateNumberOfMessages",
      label: "Messages Available",
      sortable: true,
      class: "text-center",
    },
    {
      key: "ApproximateNumberOfMessagesNotVisible",
      label: "Messages in Flight",
      sortable: true,
      class: "text-center",
    },
  ];

  async getResourcesForRegion(
    region: string,
    filterBySqsURL?: string[]
  ): Promise<QueueWithRegion[]> {
    const SQS = await this.client(region);
    if (!SQS) {
      return [];
    }

    const params: ListQueuesRequest = {};

    if (filterBySqsURL) {
      params.QueueNamePrefix = this.getQueueNameFromUrl(filterBySqsURL[0]);
    }

    const data = await SQS.listQueues(params).promise();
    if (data.QueueUrls === undefined) {
      return [];
    }

    const response: QueueWithRegion[] = [];

    data.QueueUrls?.forEach((queueUrl) => {
      if (queueUrl) {
        response.push({
          queueUrl,
          region,
          stillPresent: true,
        });

        SQS.getQueueAttributes(
          { QueueUrl: queueUrl, AttributeNames: ["All"] },
          (err, data) => {
            if (err) {
              this.showError(err.message, this.resourceName, region);
            } else {
              this.$set(this.resources, queueUrl, {
                queueUrl,
                region,
                stillPresent: true,
                ...data.Attributes,
              });
            }
          }
        );
      }
    });

    return response;
  }
}
</script>
