<template>
  <div>
    <Header v-on:refresh="getAllSubscriptions" :loading="loadingCount > 0" />

    <gl-drawer
      :open="drawerOpened && selectedSns !== {}"
      @close="close"
      style="min-width: 80%;"
    >
      <template #header>{{ selectedSnsTitle }}</template>

      <SNSSubscription :sns="selectedSns" v-on:deleted="() => close(true)" />
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

        <!--        <gl-button-->
        <!--          icon="plus"-->
        <!--          category="secondary"-->
        <!--          variant="success"-->
        <!--          class="col-2"-->
        <!--          to="/messages/sns/new"-->
        <!--          >Create new subscription-->
        <!--        </gl-button>-->
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

        <template v-slot:cell(Endpoint)="data">
          <router-link
            v-if="data.value.includes('sqs')"
            :to="`/messages/sqs?arn=${data.value}`"
          >
            {{ getLastElementArn(data.value) }}
          </router-link>
          <span v-else>{{ data.value }}</span>
        </template>

        <template v-slot:cell(TopicArn)="data">
          <gl-loading-icon
            inline
            v-if="!data.value && data.value !== 0"
          ></gl-loading-icon>
          <router-link :to="`/messages/sns_topics?topic=${data.value}`">
            {{ data.value }}
          </router-link>
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
          title="No SNS subscriptions found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <!--            <gl-button icon="plus" variant="success" to="/messages/sns/new"-->
            <!--              >Create new subscription-->
            <!--            </gl-button>-->
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
import SNSSubscription from "@/components/messages/SNS/SNSSubscription.vue";
import { SubscriptionWithRegion } from "@/components/messages/SNS/sns";

@Component({
  components: {
    StateText,
    Header,
    GlTable,
    RegionText,
    GlIcon,
    GlDrawer,
    SNSSubscription,
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
export default class SNSSubscriptionsList extends mixins(
  Formatters,
  Notifications
) {
  sns: { [key: string]: SubscriptionWithRegion } = {};

  drawerOpened = false;

  selectedSns: SubscriptionWithRegion = {};
  filter = "";
  loadingCount = 0;

  fields = [
    {
      key: "subscriptionArn",
      label: "Subscription ID",
      sortable: true,
      formatter: this.getLastElementArn,
    },
    {
      key: "Protocol",
      sortable: true,
    },
    {
      key: "Endpoint",
      sortable: true,
    },
    {
      key: "TopicArn",
      label: "Topic",
      sortable: true,
      formatter: this.getLastElementArn,
    },
    { key: "region", sortable: true },
    "Owner",
  ];

  get snsAsList(): SubscriptionWithRegion[] {
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
    if (this.selectedSns.subscriptionArn) {
      return this.getLastElementArn(this.selectedSns.subscriptionArn);
    }
    return "";
  }

  getAllSubscriptions() {
    this.regionsEnabled.forEach((region) =>
      this.getSubscriptionForRegion(region)
    );
  }

  getSubscriptionForRegion(region: string) {
    this.loadingCount++;

    const SNS = new SNSClient({
      region,
      credentials: this.$store.getters["sts/credentials"],
    });

    SNS.listSubscriptions({}, (err, data) => {
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

      data.Subscriptions?.map((t) => t.SubscriptionArn).forEach(
        (subscriptionArn) => {
          if (subscriptionArn) {
            this.$set(this.sns, subscriptionArn, {
              subscriptionArn,
              region,
              stillPresent: true,
            });

            SNS.getSubscriptionAttributes(
              { SubscriptionArn: subscriptionArn },
              (err, data) => {
                if (err) {
                  this.showError(
                    `[${region}] ` + err,
                    "loadingSnsSubscription"
                  );
                } else {
                  this.$set(this.sns, subscriptionArn, {
                    subscriptionArn,
                    region,
                    stillPresent: true,
                    ...data.Attributes,
                  });
                }
              }
            );
          }
        }
      );

      //Remove Sns we don't find anymore
      Object.keys(this.sns).forEach((key) => {
        if (this.sns[key].region === region && !this.sns[key].stillPresent) {
          this.$delete(this.sns, key);
        }
      });

      //We wait until all the data have been loaded and then we select the row on the table.
      //This is necessary because every time the data of the table is updated, a row selected event with
      //0 elements is emitted, removing our selection
      if (this.$route.query.subscriptionId && this.loadingCount === 0) {
        this.$nextTick().then(() => {
          const filteredSns = this.snsAsList.filter(
            (sns) =>
              sns.subscriptionArn &&
              this.getLastElementArn(sns.subscriptionArn) ===
                this.$route.query.subscriptionId
          );
          if (filteredSns && filteredSns.length > 0) {
            this.selectedSns = filteredSns[0];
            this.drawerOpened = true;
            const index = this.snsAsList.findIndex(
              (sns) =>
                sns.subscriptionArn &&
                this.getLastElementArn(sns.subscriptionArn) ===
                  this.$route.query.subscriptionId
            );
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            this.$refs.snsTable["$children"][0].selectRow(index);
          }
        });
      }
    });
  }

  getLastElementArn(arn: string | undefined): string {
    if (!arn) {
      return "";
    }
    const arnPieces = arn.split(":");
    return arnPieces[arnPieces.length - 1];
  }

  close(deleted = false) {
    this.drawerOpened = false;

    if (deleted && this.selectedSns.subscriptionArn) {
      this.$delete(this.sns, this.selectedSns.subscriptionArn);
    }

    // if (this.selectedSns.region) {
    //   this.getSubscriptionForRegion(this.selectedSns.region);
    // }

    this.$router
      .push({ path: "/messages/sns_subscriptions", query: {} })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .catch(() => {});
    this.selectedSns = {};

    //Do not do this at home!
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    this.$refs.snsTable["$children"][0].clearSelected();
  }

  onRowSelected(sns: SubscriptionWithRegion[]) {
    if (sns.length > 0 && sns[0].subscriptionArn) {
      this.selectedSns = sns[0];
      this.drawerOpened = true;
      this.$router
        .push({
          path: "/messages/sns_subscriptions",
          query: {
            subscriptionId: this.getLastElementArn(sns[0].subscriptionArn),
          },
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
        if (
          sns.region &&
          removedRegions.includes(sns.region) &&
          sns.subscriptionArn
        ) {
          this.$delete(this.sns, sns.subscriptionArn);
        }
      });
    }

    addedRegions.forEach((region) => this.getSubscriptionForRegion(region));
  }

  @Watch("currentRoleIndex")
  onCurrentRoleIndexChanged() {
    this.sns = {};
    this.getAllSubscriptions();
  }

  beforeMount() {
    this.getAllSubscriptions();
  }

  destroyed() {
    this.$store.commit("notifications/dismissByKey", "loadingSns");
  }
}
</script>

<style scoped></style>
