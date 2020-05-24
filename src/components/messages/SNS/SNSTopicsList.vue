<template>
  <div>
    <Header v-on:refresh="getAllTopics" :loading="loadingCount > 0" />

    <gl-drawer
      :open="drawerOpened && selectedSns !== {}"
      @close="close"
      style="min-width: 80%;"
    >
      <template #header>{{ selectedSnsTitle }}</template>

      <SNSTopic :sns="selectedSns" v-on:deleted="() => close(true)" />
    </gl-drawer>

    <div class="container-fluid">
      <div
        class="row justify-content-between mt-3 mb-2 ml-2 mr-2"
        v-if="snsAsList.length > 0"
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
          to="/messages/sns/new"
          >Create new topic
        </gl-button>
      </div>
      <gl-table
        :items="snsAsList"
        :filter="filter"
        :busy="loadingCount > 0"
        :fields="fields"
        ref="snsTable"
        selectable
        select-mode="single"
        @row-selected="onRowSelected"
        v-show="snsAsList.length > 0"
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
        <template v-slot:cell(SubscriptionsConfirmed)="data">
          <gl-loading-icon
            inline
            v-if="!data.value && data.value !== 0"
          ></gl-loading-icon>
          {{ data.value }}
        </template>
        <template v-slot:cell(SubscriptionsPending)="data">
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
          v-if="loadingCount > 0 && snsAsList.length < 1"
        />

        <gl-empty-state
          class="mt-5"
          v-if="loadingCount === 0 && snsAsList.length === 0"
          title="No SNS topics found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <gl-button icon="plus" variant="success" to="/messages/sns/new"
              >Create new topic
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
import SNSClient from "aws-sdk/clients/sns";

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
import SNSTopic from "@/components/messages/SNS/SNSTopic.vue";
import { TopicWithRegion } from "@/components/messages/SNS/sns";

@Component({
  components: {
    StateText,
    Header,
    GlTable,
    RegionText,
    GlIcon,
    GlDrawer,
    SNSTopic,
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
export default class SNSTopicsList extends mixins(Formatters, Notifications) {
  sns: { [key: string]: TopicWithRegion } = {};

  drawerOpened = false;

  selectedSns: TopicWithRegion = {};
  filter = "";
  loadingCount = 0;

  fields = [
    {
      key: "topicArn",
      label: "Topic Name",
      sortable: true,
      formatter: this.getTopicNameFromArn,
    },
    { key: "region", sortable: true },
    {
      key: "SubscriptionsConfirmed",
      label: "Confirmed subscriptions",
      sortable: true,
      class: "text-center",
    },
    {
      key: "SubscriptionsPending",
      label: "Pending subscriptions",
      sortable: true,
      class: "text-center",
    },
  ];

  get snsAsList(): TopicWithRegion[] {
    return Object.values(this.sns);
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

  get selectedSnsTitle() {
    if (this.selectedSns.topicArn) {
      return this.getTopicNameFromArn(this.selectedSns.topicArn);
    }
    return "";
  }

  get credentials() {
    return this.$store.getters["sts/credentials"];
  }

  getAllTopics() {
    this.regionsEnabled.forEach((region) => this.getTopicForRegion(region));
  }

  getTopicForRegion(region: string) {
    this.loadingCount++;

    const SNS = new SNSClient({ region, credentials: this.credentials });

    SNS.listTopics({}, (err, data) => {
      this.loadingCount--;
      Object.keys(this.sns).forEach((key) => {
        //Keep track if the sns of this region are still available
        if (this.sns[key].region === region) {
          this.sns[key].stillPresent = false;
        }
      });

      if (err) {
        this.showError(`[${region}] ` + err, "loadingSns");
        return;
      }

      data.Topics?.map((t) => t.TopicArn).forEach((topicArn) => {
        if (topicArn) {
          this.$set(this.sns, topicArn, {
            topicArn,
            region,
            stillPresent: true,
          });

          SNS.getTopicAttributes({ TopicArn: topicArn }, (err, data) => {
            if (err) {
              this.showError(`[${region}] ` + err, "loadingSnsTopic");
            } else {
              this.$set(this.sns, topicArn, {
                topicArn,
                region,
                stillPresent: true,
                ...data.Attributes,
              });
            }
          });
        }
      });

      //Remove Sns we don't find anymore
      Object.keys(this.sns).forEach((key) => {
        if (this.sns[key].region === region && !this.sns[key].stillPresent) {
          this.$delete(this.sns, key);
        }
      });

      //We wait until all the data have been loaded and then we select the row on the table.
      //This is necessary because every time the data of the table is updated, a row selected event with
      //0 elements is emitted, removing our selection
      if (this.$route.query.topic && this.loadingCount === 0) {
        this.$nextTick().then(() => {
          const filteredSns = this.snsAsList.filter(
            (sns) =>
              sns.topicArn &&
              this.getTopicNameFromArn(sns.topicArn) === this.$route.query.topic
          );
          if (filteredSns && filteredSns.length > 0) {
            this.selectedSns = filteredSns[0];
            this.drawerOpened = true;
            const index = this.snsAsList.findIndex(
              (sns) =>
                sns.topicArn &&
                this.getTopicNameFromArn(sns.topicArn) ===
                  this.$route.query.topic
            );
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            this.$refs.snsTable["$children"][0].selectRow(index);
          }
        });
      }
    });
  }

  getTopicNameFromArn(topicArn: string): string {
    const arnPieces = topicArn.split(":");
    return arnPieces[arnPieces.length - 1];
  }

  close(deleted = false) {
    this.drawerOpened = false;

    if (deleted && this.selectedSns.topicArn) {
      this.$delete(this.sns, this.selectedSns.topicArn);
    }

    // if (this.selectedSns.region) {
    //   this.getTopicForRegion(this.selectedSns.region);
    // }

    this.$router
      .push({ path: "/messages/sns_topics", query: {} })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .catch(() => {});
    this.selectedSns = {};

    //Do not do this at home!
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    this.$refs.snsTable["$children"][0].clearSelected();
  }

  onRowSelected(sns: TopicWithRegion[]) {
    if (sns.length > 0 && sns[0].topicArn) {
      this.selectedSns = sns[0];
      this.drawerOpened = true;
      this.$router
        .push({
          path: "/messages/sns_topics",
          query: { topic: this.getTopicNameFromArn(sns[0].topicArn) },
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
      this.snsAsList.forEach((sns) => {
        if (sns.region && removedRegions.includes(sns.region) && sns.topicArn) {
          this.$delete(this.sns, sns.topicArn);
        }
      });
    }

    addedRegions.forEach((region) => this.getTopicForRegion(region));
  }

  @Watch("currentRoleIndex")
  onCurrentRoleIndexChanged() {
    this.sns = {};
    this.getAllTopics();
  }

  beforeMount() {
    this.getAllTopics();
  }

  destroyed() {
    this.$store.commit("notifications/dismissByKey", "loadingSns");
  }
}
</script>

<style scoped></style>
