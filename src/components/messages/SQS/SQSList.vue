<template>
  <div>
    <Header v-on:refresh="getAllQueues" :loading="loadingCount > 0" />

    <gl-drawer
      :open="drawerOpened && selectedSqs !== {}"
      @close="close"
      style="min-width: 80%;"
    >
      <template #header>{{ selectedSqsTitle }}</template>

      <SQS :sqs="selectedSqs" v-on:deleted="close" />
    </gl-drawer>

    <div class="container-fluid">
      <div
        class="row justify-content-between mt-3 mb-2 ml-2 mr-2"
        v-if="sqsAsList.length > 0"
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
        :items="sqsAsList"
        :filter="filter"
        :busy="loadingCount > 0"
        :fields="fields"
        ref="sqsTable"
        selectable
        select-mode="single"
        @row-selected="onRowSelected"
        v-show="sqsAsList.length > 0"
        show-empty
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
          v-if="loadingCount > 0 && sqsAsList.length < 1"
        />

        <gl-empty-state
          class="mt-5"
          v-if="loadingCount === 0 && sqsAsList.length === 0"
          title="No Sqs found in the selected regions!"
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
import SQSClient from "aws-sdk/clients/sqs";

import Header from "@/components/Header/Header.vue";
import RegionText from "@/components/common/RegionText.vue";
import {
  GlDrawer,
  GlFormInput,
  GlIcon,
  GlButton,
  GlTable,
  GlEmptyState,
  GlSkeletonLoading,
  GlModalDirective,
  GlLoadingIcon,
} from "@gitlab/ui";
import { Formatters } from "@/mixins/formatters";
import Component, { mixins } from "vue-class-component";
import StateText from "@/components/common/StateText.vue";
import Notifications from "@/mixins/notifications";
import { Watch } from "vue-property-decorator";
import SQS from "@/components/messages/SQS/SQS.vue";
import { QueueWithRegion } from "@/components/messages/SQS/sqs";
import { ListQueuesRequest } from "aws-sdk/clients/sqs";

@Component({
  components: {
    StateText,
    Header,
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
export default class SQSList extends mixins(Formatters, Notifications) {
  sqs: { [key: string]: QueueWithRegion } = {};

  drawerOpened = false;

  selectedSqs: QueueWithRegion = {};
  filter = "";
  loadingCount = 0;

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

  get sqsAsList(): QueueWithRegion[] {
    return Object.values(this.sqs);
  }

  get regionsEnabled(): string[] {
    return this.$store.getters["sts/regions"];
  }

  get currentRoleIndex(): number {
    return this.$store.getters["sts/currentRoleIndex"];
  }

  get emptyStateDescription(): string {
    return (
      "Daintree hasn't found any queue in the selected regions! You can create a new one, or change selected regions in the settings. We have looked in " +
      this.regionsEnabled.join(", ") +
      "."
    );
  }

  get selectedSqsTitle() {
    if (this.selectedSqs.queueUrl) {
      return this.getQueueNameFromUrl(this.selectedSqs.queueUrl);
    }
    return "";
  }

  getAllQueues() {
    this.regionsEnabled.forEach((region) => this.getQueueForRegion(region));
  }

  getQueueForRegion(region: string, filterBySqsURL?: string) {
    //While polling we do not set the loading state 'cause it is annoying
    if (!filterBySqsURL) {
      this.loadingCount++;
    }

    const SQS = new SQSClient({
      region,
      credentials: this.$store.getters["sts/credentials"],
    });

    const params: ListQueuesRequest = {};

    if (filterBySqsURL) {
      params.QueueNamePrefix = this.getQueueNameFromUrl(filterBySqsURL);
    }

    SQS.listQueues(params, (err, data) => {
      if (!filterBySqsURL) {
        this.loadingCount--;
        Object.keys(this.sqs).forEach((key) => {
          //Keep track if the sqs of this region are still available
          if (this.sqs[key].region === region) {
            this.sqs[key].stillPresent = false;
          }
        });
      }

      if (err) {
        this.showError(`[${region}] ` + err, "loadingSqs");
        return;
      }

      //When we retrieve only some Sqs, if we don't retrieve them it means they have been deleted
      if (filterBySqsURL) {
        if (!data.QueueUrls || !data.QueueUrls.includes(filterBySqsURL)) {
          this.$delete(this.sqs, filterBySqsURL);
        }
      }

      data.QueueUrls?.forEach((queueUrl) => {
        if (queueUrl) {
          this.$set(this.sqs, queueUrl, {
            queueUrl,
            region,
            stillPresent: true,
          });

          SQS.getQueueAttributes(
            { QueueUrl: queueUrl, AttributeNames: ["All"] },
            (err, data) => {
              if (err) {
                this.showError(`[${region}] ` + err, "loadingSqsQueue");
              } else {
                this.$set(this.sqs, queueUrl, {
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

      //Remove Sqs we don't find anymore
      if (!filterBySqsURL) {
        Object.keys(this.sqs).forEach((key) => {
          if (this.sqs[key].region === region && !this.sqs[key].stillPresent) {
            this.$delete(this.sqs, key);
          }
        });
      }

      //We wait until all the data have been loaded and then we select the row on the table.
      //This is necessary because every time the data of the table is updated, a row selected event with
      //0 elements is emitted, removing our selection
      //We also accept ARNs, only because SNS subscriptions know them but not the Url
      if (
        (this.$route.query.queueUrl || this.$route.query.arn) &&
        this.loadingCount === 0
      ) {
        this.$nextTick().then(() => {
          const filteredSqs = this.sqsAsList.filter(
            (sqs) =>
              sqs.queueUrl === this.$route.query.queueUrl ||
              sqs.QueueArn === this.$route.query.arn
          );
          if (filteredSqs && filteredSqs.length > 0) {
            this.selectedSqs = filteredSqs[0];
            this.drawerOpened = true;
            const index = this.sqsAsList.findIndex(
              (sqs) =>
                sqs.queueUrl === this.$route.query.queueUrl ||
                sqs.QueueArn === this.$route.query.arn
            );
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            //@ts-ignore
            this.$refs.sqsTable["$children"][0].selectRow(index);
          }
        });
      }
    });
  }

  getQueueNameFromUrl(queueUrl: string): string {
    const queuePieces = queueUrl.split("/");
    return queuePieces[queuePieces.length - 1];
  }

  close() {
    this.drawerOpened = false;

    if (this.selectedSqs.region && this.selectedSqs.queueUrl) {
      this.getQueueForRegion(
        this.selectedSqs.region,
        this.selectedSqs.queueUrl
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.$router.push({ path: "/messages/sqs", query: {} }).catch(() => {});
    this.selectedSqs = {};

    //Do not do this at home!
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    //@ts-ignore
    this.$refs.sqsTable["$children"][0].clearSelected();
  }

  onRowSelected(sqs: QueueWithRegion[]) {
    if (sqs.length > 0) {
      this.selectedSqs = sqs[0];
      this.drawerOpened = true;
      this.$router
        .push({
          path: "/messages/sqs",
          query: { queueUrl: sqs[0].queueUrl },
        })
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .catch(() => {});
    } else {
      this.close();
    }
  }

  @Watch("regionsEnabled")
  onRegionsEnabledChanged(newValue: string[], oldValue: string[]) {
    const addedRegions = [...newValue.filter((d) => !oldValue.includes(d))];
    const removedRegions = [...oldValue.filter((d) => !newValue.includes(d))];

    if (removedRegions.length > 0) {
      this.sqsAsList.forEach((sqs) => {
        if (sqs.region && removedRegions.includes(sqs.region) && sqs.queueUrl) {
          this.$delete(this.sqs, sqs.queueUrl);
        }
      });
    }

    addedRegions.forEach((region) => this.getQueueForRegion(region));
  }

  @Watch("currentRoleIndex")
  onCurrentRoleIndexChanged() {
    this.sqs = {};
    this.getAllQueues();
  }

  beforeMount() {
    this.getAllQueues();
  }

  destroyed() {
    this.$store.commit("notifications/dismissByKey", "loadingSqs");
  }
}
</script>

<style scoped></style>
