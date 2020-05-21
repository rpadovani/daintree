<template>
  <div>
    <Header v-on:refresh="getAllIgws" :loading="loadingCount > 0" />

    <gl-drawer
      :open="drawerOpened && selectedIgw !== {}"
      @close="() => close()"
      style="min-width: 80%;"
    >
      <template #header>{{ selectedIgwTitle }}</template>

      <Igw :igw="selectedIgw" v-on:deleted="() => close()" />
    </gl-drawer>

    <div class="container-fluid">
      <div
        class="row justify-content-between mt-3 mb-2 ml-2 mr-2"
        v-if="igwsAsList.length > 0"
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
          to="/network/igws/new"
          >Create new
        </gl-button>
      </div>
      <gl-table
        :items="igwsAsList"
        :fields="fields"
        :filter="filter"
        :busy="loadingCount > 0"
        ref="igwsTable"
        selectable
        select-mode="single"
        @row-selected="onRowSelected"
        v-show="igwsAsList.length > 0"
        show-empty
      >
        <template v-slot:emptyfiltered="">
          <gl-empty-state
            class="mt-5"
            title="No resource matching your search!"
            svg-path="/assets/undraw_file_searching_duff.svg"
            description="Remove the filter above to see all your resource"
            compact
          />
        </template>
        <template v-slot:cell(state)="data">
          <StateText
            v-if="data.item.Attachments && data.item.Attachments.length > 0"
            state="attached"
          />
          <StateText v-else state="detached" />
        </template>
        <template v-slot:cell(region)="data">
          <RegionText :region="data.value" />
        </template>
        <template v-slot:cell(VpcId)="data">
          <router-link
            v-if="data.item.Attachments && data.item.Attachments.length > 0"
            :to="`/network/vpcs?vpcId=${data.item.Attachments[0].VpcId}`"
          >
            {{ data.item.Attachments[0].VpcId }}
          </router-link>
          <span v-else>N/A</span>
        </template>
      </gl-table>

      <div class="container">
        <gl-skeleton-loading
          class="mt-5"
          v-if="loadingCount > 0 && igwsAsList.length < 1"
        />

        <gl-empty-state
          class="mt-5"
          v-if="loadingCount === 0 && igwsAsList.length === 0"
          title="No Internet Gateways found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <gl-button icon="plus" variant="success" to="/network/igws/new"
              >Create new Igw Gateway
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
import EC2Client from "aws-sdk/clients/ec2";

import Header from "@/components/Header/Header.vue";
import Igw from "./Igw.vue";
import RegionText from "@/components/common/RegionText.vue";
import {
  GlDrawer,
  GlEmptyState,
  GlFormInput,
  GlModalDirective,
  GlButton,
  GlSkeletonLoading,
  GlTable,
} from "@gitlab/ui";
import { Component, Watch } from "vue-property-decorator";
import { Formatters } from "@/mixins/formatters";
import { DescribeInternetGatewaysRequest } from "aws-sdk/clients/ec2";
import StateText from "@/components/common/StateText.vue";
import Notifications from "@/mixins/notifications";
import { mixins } from "vue-class-component";
import { igws } from "@/components/network/igw/igw";
import IgwWithRegion = igws.IgwWithRegion;

@Component({
  components: {
    StateText,
    Header,
    GlTable,
    RegionText,
    GlDrawer,
    GlButton,
    GlFormInput,
    Igw,
    GlSkeletonLoading,
    GlEmptyState,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
  },
})
export default class IgwList extends mixins(Formatters, Notifications) {
  igws: { [key: string]: IgwWithRegion } = {};

  drawerOpened = false;

  selectedIgw: IgwWithRegion = {};
  filter = "";
  loadingCount = 0;

  fields = [
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: this.extractNameFromTags,
    },
    { key: "InternetGatewayId", sortable: true },
    "State",
    { key: "region", sortable: true },
    "VpcId",
    { key: "OwnerId", sortable: true },
  ];

  get igwsAsList(): IgwWithRegion[] {
    return Object.values(this.igws);
  }

  get regionsEnabled(): string[] {
    return this.$store.getters["sts/regions"];
  }

  get currentRoleIndex(): number {
    return this.$store.getters["sts/currentRoleIndex"];
  }

  get emptyStateDescription(): string {
    return (
      "Daintree hasn't found any Internet Gateway in the selected regions! You can create a new one, or change selected regions in the settings. We have looked in " +
      this.$store.getters["sts/regions"].join(", ") +
      "."
    );
  }

  get selectedIgwTitle() {
    const nameTag = this.selectedIgw?.Tags?.filter((v) => v.Key === "Name");

    if (nameTag && nameTag.length > 0) {
      return `${nameTag[0].Value} (${this.selectedIgw.InternetGatewayId})`;
    }
    return this.selectedIgw.InternetGatewayId;
  }

  getAllIgws() {
    this.regionsEnabled.forEach((region) => this.getIgwForRegion(region));
  }

  get credentials() {
    return this.$store.getters["sts/credentials"];
  }

  getIgwForRegion(region: string, filterByIgwsId?: string[]) {
    //While polling we do not set the loading state 'cause it is annoying
    if (!filterByIgwsId) {
      this.loadingCount++;
    }
    const EC2 = new EC2Client({
      region,
      credentials: this.credentials,
    });
    const params: DescribeInternetGatewaysRequest = {};
    if (filterByIgwsId) {
      params.Filters = [
        {
          Name: "internet-gateway-id",
          Values: filterByIgwsId,
        },
      ];
    }

    EC2.describeInternetGateways(params, (err, data) => {
      if (!filterByIgwsId) {
        this.loadingCount--;
        Object.keys(this.igws).forEach((key) => {
          //Keep track if the igws of this region are still available
          if (this.igws[key].region === region) {
            this.igws[key].stillPresent = false;
          }
        });
      }
      if (err) {
        this.showError(`[${region}] ` + err, "loadingIgw");
        return;
      }

      //When we retrieve only some IGWs, if we don't retrieve them it means they have been deleted
      if (filterByIgwsId) {
        const retrievedIds = data.InternetGateways?.map(
          (i) => i.InternetGatewayId
        );

        filterByIgwsId.forEach((idFiltered) => {
          if (!retrievedIds || !retrievedIds.includes(idFiltered)) {
            this.$delete(this.igws, idFiltered);
          }
        });
      }

      data.InternetGateways?.forEach((igw) => {
        if (igw.InternetGatewayId) {
          this.$set(this.igws, igw.InternetGatewayId, {
            ...igw,
            region,
            stillPresent: true,
          });
        }
      });

      //Remove nat gateways we don't find anymore
      if (!filterByIgwsId) {
        Object.keys(this.igws).forEach((key) => {
          if (
            this.igws[key].region === region &&
            !this.igws[key].stillPresent
          ) {
            this.$delete(this.igws, key);
          }
        });
      }

      //We wait until all the data have been loaded and then we select the row on the table.
      //This is necessary because every time the data of the table is updated, a row selected event with
      //0 elements is emitted, removing our selection
      if (this.$route.query.igwId && this.loadingCount === 0) {
        this.$nextTick().then(() => {
          const filteredIgws = this.igwsAsList.filter(
            (igw) => igw.InternetGatewayId === this.$route.query.igwId
          );
          if (filteredIgws && filteredIgws.length > 0) {
            this.selectedIgw = filteredIgws[0];
            this.drawerOpened = true;
            const index = this.igwsAsList.findIndex(
              (igw) => igw.InternetGatewayId === this.$route.query.igwId
            );
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            //@ts-ignore
            this.$refs.igwsTable["$children"][0].selectRow(index);
          }
        });
      }
    });
  }

  close() {
    this.drawerOpened = false;

    //Check if the user has changed something while working on the Internet Gateway
    if (this.selectedIgw.region && this.selectedIgw.InternetGatewayId) {
      this.getIgwForRegion(this.selectedIgw.region, [
        this.selectedIgw.InternetGatewayId,
      ]);
    }

    //We silence the error: it's a "NavigationDuplicate" because we aren't changing component
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.$router.push({ path: "/network/igws", query: {} }).catch(() => {});
    this.selectedIgw = {};

    //Do not do this at home!
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    //@ts-ignore
    this.$refs.igwsTable["$children"][0].clearSelected();
  }

  onRowSelected(igws: IgwWithRegion[]) {
    if (igws.length > 0) {
      this.selectedIgw = igws[0];
      this.drawerOpened = true;
      this.$router
        .push({
          path: "/network/igws",
          query: { igwId: igws[0].InternetGatewayId },
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
      this.igwsAsList.forEach((igw) => {
        if (
          igw.region &&
          removedRegions.includes(igw.region) &&
          igw.InternetGatewayId
        ) {
          this.$delete(this.igws, igw.InternetGatewayId);
        }
      });
    }

    addedRegions.forEach((region) => this.getIgwForRegion(region));
  }

  beforeMount() {
    this.getAllIgws();
  }

  @Watch("currentRoleIndex")
  onCurrentRoleIndexChanged() {
    this.igws = {};
    this.getAllIgws();
  }

  destroyed() {
    this.$store.commit("notifications/dismissByKey", "loadingIgw");
    this.$store.commit("notifications/dismissByKey", "createIgw");
    this.$store.commit("notifications/dismissByKey", "creatingIgw");
    this.$store.commit("notifications/dismissByKey", "deleteIgw");
    this.$store.commit("notifications/dismissByKey", "deletingIgw");
  }
}
</script>

<style scoped></style>
