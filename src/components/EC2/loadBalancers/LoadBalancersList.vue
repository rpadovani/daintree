<template>
  <div>
    <Header v-on:refresh="getAllLoadBalancers" :loading="loadingCount > 0" />

    <gl-drawer
      :open="drawerOpened && selectedLoadBalancer !== {}"
      @close="close"
      style="min-width: 80%;"
    >
      <template #header>{{ selectedLoadBalancerTitle }}</template>

      <LoadBalancer :loadBalancer="selectedLoadBalancer" />
    </gl-drawer>

    <div class="container-fluid">
      <div
        class="row justify-content-between mt-3 mb-2 ml-2 mr-2"
        v-if="loadBalancersAsList.length > 0"
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
          href="#/eLBv2/loadBalancers/new"
          v-if="false"
          >Launch a new loadBalancer</gl-button
        >
      </div>

      <gl-table
        ref="loadBalancersTable"
        :items="loadBalancersAsList"
        :fields="fields"
        :filter="filter"
        :busy="loadingCount > 0"
        selectable
        select-mode="single"
        @row-selected="onRowSelected"
        v-show="loadBalancersAsList.length > 0"
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

        <template v-slot:cell(state)="data">
          <StateText :state="data.value" />
        </template>
        <template v-slot:cell(region)="data">
          <RegionText :region="data.value" />
        </template>

        <template v-slot:cell(VpcId)="data">
          <router-link :to="`/network/vpcs?vpcId=${data.value}`">
            {{ data.value }}
          </router-link>
        </template>
      </gl-table>
    </div>

    <div class="container">
      <gl-skeleton-loading
        class="mt-5"
        v-if="loadingCount > 0 && loadBalancersAsList.length < 1"
      />

      <gl-empty-state
        class="mt-5"
        v-if="loadingCount === 0 && loadBalancersAsList.length === 0"
        title="No load balancers found in the selected regions!"
        svg-path="/assets/undraw_empty_xct9.svg"
        :description="emptyStateDescription"
        compact
      >
        <template #actions>
          <gl-button
            v-if="false"
            icon="plus"
            variant="success"
            to="/network/loadBalancers/new"
            >Launch new loadBalancer
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
</template>

<script lang="ts">
import ELBv2Client, {
  DescribeLoadBalancersInput,
  LoadBalancerState,
} from "aws-sdk/clients/elbv2";
import Header from "../../Header/Header.vue";
import LoadBalancer from "./LoadBalancer.vue";
import {
  GlTable,
  GlDrawer,
  GlFormInput,
  GlButton,
  GlSkeletonLoading,
  GlEmptyState,
  GlModalDirective,
} from "@gitlab/ui";
import { Component, Watch } from "vue-property-decorator";
import { Formatters } from "@/mixins/formatters";
import StateText from "@/components/common/StateText.vue";
import RegionText from "@/components/common/RegionText.vue";
import { loadBalancers } from "@/components/EC2/loadBalancers/loadBalancer";
import LoadBalancerWithRegion = loadBalancers.LoadBalancerWithRegion;
import { mixins } from "vue-class-component";
import Notifications from "@/mixins/notifications";

@Component({
  components: {
    Header,
    GlTable,
    GlDrawer,
    GlFormInput,
    GlButton,
    LoadBalancer,
    StateText,
    RegionText,
    GlSkeletonLoading,
    GlEmptyState,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
  },
})
export default class LoadBalancers extends mixins(Formatters, Notifications) {
  loadBalancers: { [key: string]: LoadBalancerWithRegion } = {};
  selectedLoadBalancer: LoadBalancerWithRegion = {};
  drawerOpened = false;

  filter = "";
  loadingCount = 0;

  //A list of loadBalancers that are being created or deleted by region. We poll over them.
  wipLoadBalancers: { [key: string]: string[] } = {};
  isPolling = false;

  fields = [
    {
      key: "LoadBalancerName",
      label: "Name",
      sortable: true,
    },
    {
      key: "Type",
      sortable: true,
    },
    {
      key: "Scheme",
      sortable: true,
    },
    { key: "State", formatter: (state: LoadBalancerState) => state.Code },
    {
      key: "region",
      sortable: true,
    },
    { key: "VpcId", sortable: true },
    { key: "CreatedTime", sortable: true, formatter: this.standardDate },
  ];

  get loadBalancersAsList(): LoadBalancerWithRegion[] {
    return Object.values(this.loadBalancers);
  }

  get regionsEnabled(): string[] {
    return this.$store.getters["sts/regions"];
  }

  get currentRoleIndex(): number {
    return this.$store.getters["sts/currentRoleIndex"];
  }

  get emptyStateDescription(): string {
    return (
      "Daintree hasn't found any load balancer in the selected regions! You can change selected regions in the settings. We have looked in " +
      this.$store.getters["sts/regions"].join(", ") +
      "."
    );
  }

  get selectedLoadBalancerTitle(): string | undefined {
    const name = this.selectedLoadBalancer?.LoadBalancerName;

    if (name) {
      return `${name} (${this.selectedLoadBalancer.LoadBalancerArn})`;
    }
    return this.selectedLoadBalancer.LoadBalancerArn;
  }

  getAllLoadBalancers() {
    this.regionsEnabled.forEach((region) =>
      this.getLoadBalancerForRegion(region)
    );
  }

  getLoadBalancerForRegion(
    region: string,
    filterByLoadBalancerArns?: string[]
  ) {
    //While polling we do not set the loading state 'cause it is annoying
    if (!filterByLoadBalancerArns) {
      this.loadingCount++;
    }

    const ELBv2 = new ELBv2Client({
      region,
      credentials: this.$store.getters["sts/credentials"],
    });
    const params: DescribeLoadBalancersInput = {};
    if (filterByLoadBalancerArns) {
      params.LoadBalancerArns = filterByLoadBalancerArns;
    }

    ELBv2.describeLoadBalancers(params, (err, data) => {
      if (!filterByLoadBalancerArns) {
        this.loadingCount--;
        Object.keys(this.loadBalancers).forEach((key) => {
          //Keep track if the loadBalancers of this region are still available
          if (this.loadBalancers[key].region === region) {
            this.loadBalancers[key].stillPresent = false;
          }
        });
      }

      if (err) {
        this.showError(`[${region}] ` + err, "loadingLoadBalancer");
        return;
      }

      data.LoadBalancers?.forEach((loadBalancer) => {
        if (loadBalancer.LoadBalancerArn) {
          this.$set(this.loadBalancers, loadBalancer.LoadBalancerArn, {
            ...loadBalancer,
            region,
            stillPresent: true,
          });

          //If loadBalancers are pending we save them in the wip loadBalancers, so we can poll over them
          //Otherwise, if they are not pending, we remove them from the wip state
          if (
            loadBalancer.State &&
            loadBalancer.State.Code === "provisioning"
          ) {
            if (!this.wipLoadBalancers[region]) {
              this.$set(this.wipLoadBalancers, region, [
                loadBalancer.LoadBalancerArn,
              ]);
            } else if (
              !this.wipLoadBalancers[region].includes(
                loadBalancer.LoadBalancerArn
              )
            ) {
              this.wipLoadBalancers[region].push(loadBalancer.LoadBalancerArn);
            }
            this.startPolling();
          } else if (
            this.wipLoadBalancers[region] &&
            this.wipLoadBalancers[region].includes(loadBalancer.LoadBalancerArn)
          ) {
            const loadBalancerIndex = this.wipLoadBalancers[region].findIndex(
              (v) => v === loadBalancer.LoadBalancerArn
            );
            //If we were creating a loadBalancer on our own, we dismiss the creating / deleting alert
            this.dismissAlertByResourceID(loadBalancer.LoadBalancerArn);
            this.wipLoadBalancers[region].slice(
              loadBalancerIndex,
              loadBalancerIndex + 1
            );
          }
        }
      });

      //Remove loadBalancer we don't find anymore
      if (!filterByLoadBalancerArns) {
        Object.keys(this.loadBalancers).forEach((key) => {
          if (
            this.loadBalancers[key].region === region &&
            !this.loadBalancers[key].stillPresent
          ) {
            this.$delete(this.loadBalancers, key);
          }
        });
      }

      //We wait until all the data have been loaded and then we select the row on the table.
      //This is necessary because every time the data of the table is updated, a row selected event with
      //0 elements is emitted, removing our selection
      if (this.$route.query.loadBalancerArn && this.loadingCount === 0) {
        this.$nextTick().then(() => {
          const filteredLoadBalancers = this.loadBalancersAsList.filter(
            (loadBalancer) =>
              loadBalancer.LoadBalancerArn === this.$route.query.loadBalancerArn
          );
          if (filteredLoadBalancers && filteredLoadBalancers.length > 0) {
            this.selectedLoadBalancer = filteredLoadBalancers[0];
            this.drawerOpened = true;
            const index = this.loadBalancersAsList.findIndex(
              (loadBalancer) =>
                loadBalancer.LoadBalancerArn ===
                this.$route.query.loadBalancerArn
            );
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            this.$refs.loadBalancersTable["$children"][0].selectRow(index);
          }
        });
      }
    });
  }

  close(update?: boolean) {
    this.drawerOpened = false;

    if (
      update &&
      this.selectedLoadBalancer.region &&
      this.selectedLoadBalancer.LoadBalancerArn
    ) {
      this.getLoadBalancerForRegion(this.selectedLoadBalancer.region, [
        this.selectedLoadBalancer.LoadBalancerArn,
      ]);
    }

    //We silence the error: it's a "NavigationDuplicate" because we aren't changing component
    this.$router
      .push({ path: "/ec2/loadBalancers", query: {} })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .catch(() => {});
    this.selectedLoadBalancer = {};

    //Do not do this at home!
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    this.$refs.loadBalancersTable["$children"][0].clearSelected();
  }

  onRowSelected(loadBalancers: LoadBalancerWithRegion[]) {
    if (loadBalancers.length > 0) {
      this.selectedLoadBalancer = loadBalancers[0];
      this.drawerOpened = true;
      this.$router
        .push({
          path: "/ec2/loadBalancers",
          query: { loadBalancerArn: loadBalancers[0].LoadBalancerArn },
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
      this.loadBalancersAsList.forEach((loadBalancer) => {
        if (
          loadBalancer.region &&
          removedRegions.includes(loadBalancer.region) &&
          loadBalancer.LoadBalancerArn
        ) {
          this.$delete(this.loadBalancers, loadBalancer.LoadBalancerArn);
        }
      });
    }

    addedRegions.forEach((region) => this.getLoadBalancerForRegion(region));
  }

  startPolling() {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;
    window.setTimeout(() => {
      this.isPolling = false;

      Object.keys(this.wipLoadBalancers).forEach((region) => {
        if (this.wipLoadBalancers[region].length > 0) {
          this.getLoadBalancerForRegion(region, this.wipLoadBalancers[region]);
        }
      });
    }, 5000);
  }

  beforeMount() {
    this.getAllLoadBalancers();
  }

  @Watch("currentRoleIndex")
  onCurrentRoleIndexChanged() {
    this.loadBalancers = {};
    this.getAllLoadBalancers();
  }

  destroyed() {
    this.$store.commit("notifications/dismissByKey", "loadingLoadBalancer");
  }
}
</script>

<style scoped></style>
