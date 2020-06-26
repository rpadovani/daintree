<template>
  <div>
    <gl-drawer
      :open="drawerOpened && selectedResourceKey !== ''"
      @close="close"
      style="min-width: 80%;"
    >
      <template #header>{{ selectedResourceTitle }}</template>

      <SNSSubscription :sns="selectedResource" v-on:deleted="close" />
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
          v-if="isLoading && resourcesAsList.length < 1"
        />

        <gl-empty-state
          class="mt-5"
          v-else-if="!isLoading && resourcesAsList.length === 0"
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
import SNSSubscription from "@/components/messages/SNS/SNSSubscription.vue";
import { SubscriptionWithRegion } from "@/components/messages/SNS/sns";
import { SnsListComponent } from "@/components/messages/SNS/snsListComponent";

@Component({
  components: {
    StateText,
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
export default class SNSSubscriptionsList extends SnsListComponent<
  SubscriptionWithRegion,
  "subscriptionArn"
> {
  resourceName = "topic";
  canCreate = false;
  resourceUniqueKey: "subscriptionArn" = "subscriptionArn";

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

  async getResourcesForRegion(
    region: string
  ): Promise<SubscriptionWithRegion[]> {
    const SNS = await this.client(region);
    if (!SNS) {
      return [];
    }

    const data = await SNS.listSubscriptions().promise();
    if (data.Subscriptions === undefined) {
      return [];
    }

    const response: SubscriptionWithRegion[] = [];

    data.Subscriptions?.map((t) => t.SubscriptionArn).forEach(
      (subscriptionArn) => {
        if (subscriptionArn) {
          response.push({
            subscriptionArn,
            region,
            stillPresent: true,
          });

          SNS.getSubscriptionAttributes(
            { SubscriptionArn: subscriptionArn },
            (err, data) => {
              if (err) {
                this.showError(err.message, this.resourceName, region);
              } else {
                this.$set(this.resources, subscriptionArn, {
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

    return response;
  }
}
</script>
