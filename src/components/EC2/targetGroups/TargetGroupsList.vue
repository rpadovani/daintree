<template>
  <div>
    <Header v-on:refresh="getAllTargetGroups" :loading="loadingCount > 0" />

    <gl-drawer
      :open="drawerOpened && selectedTargetGroup !== {}"
      @close="close"
      style="width: 80%;"
    >
      <template #header>{{ selectedTargetGroupTitle }}</template>

      <TargetGroup :targetGroup="selectedTargetGroup" />
    </gl-drawer>

    <div class="container-fluid">
      <div
        class="row justify-content-between mt-3 mb-2 ml-2 mr-2"
        v-if="targetGroupsAsList.length > 0"
      >
        <gl-form-input
          class="col-9"
          id="filter"
          v-model="filter"
          placeholder="Type to filter..."
        />

        <gl-button
          icon="plus"
          category="secondary"
          variant="success"
          class="col-2"
          href="#/eLBv2/targetGroups/new"
          v-if="false"
          >Create a new target group</gl-button
        >
      </div>

      <gl-table
        ref="targetGroupsTable"
        :items="targetGroupsAsList"
        :fields="fields"
        :filter="filter"
        :busy="loadingCount > 0"
        selectable
        select-mode="single"
        @row-selected="onRowSelected"
        v-show="targetGroupsAsList.length > 0"
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

        <template v-slot:cell(VpcId)="data">
          <router-link :to="`/network/vpcs?vpcId=${data.value}`">
            {{ data.value }}
          </router-link>
        </template>

        <template v-slot:cell(LoadBalancerArns)="data">
          <router-link
            :to="`/ec2/loadBalancers?loadBalancerArn=${lb}`"
            v-for="lb in data.value"
            :key="lb"
          >
            {{ extractLBName(lb) }}
          </router-link>
        </template>
      </gl-table>
    </div>

    <div class="container">
      <gl-skeleton-loading
        class="mt-5"
        v-if="loadingCount > 0 && targetGroupsAsList.length < 1"
      />

      <gl-empty-state
        class="mt-5"
        v-if="loadingCount === 0 && targetGroupsAsList.length === 0"
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
            to="/network/targetGroups/new"
            >Launch new targetGroup
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
import ELBv2Client, { DescribeTargetGroupsInput } from "aws-sdk/clients/elbv2";
import Header from "../../Header/Header.vue";
import TargetGroup from "./TargetGroup.vue";
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
import { targetGroups } from "@/components/EC2/targetGroups/targetGroup";
import TargetGroupWithRegion = targetGroups.TargetGroupWithRegion;
import { mixins } from "vue-class-component";
import Notifications from "@/mixins/notifications";

@Component({
  components: {
    Header,
    GlTable,
    GlDrawer,
    GlFormInput,
    GlButton,
    TargetGroup,
    StateText,
    RegionText,
    GlSkeletonLoading,
    GlEmptyState,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
  },
})
export default class TargetGroups extends mixins(Formatters, Notifications) {
  targetGroups: { [key: string]: TargetGroupWithRegion } = {};
  selectedTargetGroup: TargetGroupWithRegion = {};
  drawerOpened = false;

  filter = "";
  loadingCount = 0;

  fields = [
    {
      key: "TargetGroupName",
      label: "Name",
      sortable: true,
    },
    {
      key: "Port",
      sortable: true,
    },
    {
      key: "Protocol",
      sortable: true,
    },
    { key: "TargetType", label: "Target type", sortable: true },
    {
      key: "region",
      sortable: true,
    },
    { key: "VpcId", sortable: true },
    { key: "LoadBalancerArns", label: "Load balancer", sortable: false },
  ];

  get targetGroupsAsList(): TargetGroupWithRegion[] {
    return Object.values(this.targetGroups);
  }

  get regionsEnabled(): string[] {
    return this.$store.getters["sts/regions"];
  }

  get currentRoleIndex(): number {
    return this.$store.getters["sts/currentRoleIndex"];
  }

  get emptyStateDescription(): string {
    return (
      "Daintree hasn't found any target group in the selected regions! You can change selected regions in the settings. We have looked in " +
      this.$store.getters["sts/regions"].join(", ") +
      "."
    );
  }

  get selectedTargetGroupTitle(): string | undefined {
    const name = this.selectedTargetGroup?.TargetGroupName;

    if (name) {
      return `${name} (${this.selectedTargetGroup.TargetGroupArn})`;
    }
    return this.selectedTargetGroup.TargetGroupArn;
  }

  extractLBName(lbArn: string): string {
    const splitted = lbArn.split("/");
    return splitted[splitted.length - 2];
  }

  getAllTargetGroups() {
    this.regionsEnabled.forEach((region) =>
      this.getTargetGroupForRegion(region)
    );
  }

  getTargetGroupForRegion(region: string, filterByTargetGroupArns?: string[]) {
    //While polling we do not set the loading state 'cause it is annoying
    if (!filterByTargetGroupArns) {
      this.loadingCount++;
    }

    const ELBv2 = new ELBv2Client({
      region,
      credentials: this.$store.getters["sts/credentials"],
    });
    const params: DescribeTargetGroupsInput = {};
    if (filterByTargetGroupArns) {
      params.TargetGroupArns = filterByTargetGroupArns;
    }

    ELBv2.describeTargetGroups(params, (err, data) => {
      if (!filterByTargetGroupArns) {
        this.loadingCount--;
        Object.keys(this.targetGroups).forEach((key) => {
          //Keep track if the targetGroups of this region are still available
          if (this.targetGroups[key].region === region) {
            this.targetGroups[key].stillPresent = false;
          }
        });
      }

      if (err) {
        this.showError(`[${region}] ` + err, "loadingTargetGroup");
        return;
      }

      data.TargetGroups?.forEach((targetGroup) => {
        if (targetGroup.TargetGroupArn) {
          this.$set(this.targetGroups, targetGroup.TargetGroupArn, {
            ...targetGroup,
            region,
            stillPresent: true,
          });
        }
      });

      //Remove targetGroup we don't find anymore
      if (!filterByTargetGroupArns) {
        Object.keys(this.targetGroups).forEach((key) => {
          if (
            this.targetGroups[key].region === region &&
            !this.targetGroups[key].stillPresent
          ) {
            this.$delete(this.targetGroups, key);
          }
        });
      }

      //We wait until all the data have been loaded and then we select the row on the table.
      //This is necessary because every time the data of the table is updated, a row selected event with
      //0 elements is emitted, removing our selection
      if (this.$route.query.targetGroupArn && this.loadingCount === 0) {
        this.$nextTick().then(() => {
          const filteredTargetGroups = this.targetGroupsAsList.filter(
            (targetGroup) =>
              targetGroup.TargetGroupArn === this.$route.query.targetGroupArn
          );
          if (filteredTargetGroups && filteredTargetGroups.length > 0) {
            this.selectedTargetGroup = filteredTargetGroups[0];
            this.drawerOpened = true;
            const index = this.targetGroupsAsList.findIndex(
              (targetGroup) =>
                targetGroup.TargetGroupArn === this.$route.query.targetGroupArn
            );
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            //@ts-ignore
            this.$refs.targetGroupsTable["$children"][0].selectRow(index);
          }
        });
      }
    });
  }

  close(update?: boolean) {
    this.drawerOpened = false;

    if (
      update &&
      this.selectedTargetGroup.region &&
      this.selectedTargetGroup.TargetGroupArn
    ) {
      this.getTargetGroupForRegion(this.selectedTargetGroup.region, [
        this.selectedTargetGroup.TargetGroupArn,
      ]);
    }

    //We silence the error: it's a "NavigationDuplicate" because we aren't changing component
    this.$router
      .push({ path: "/ec2/targetGroups", query: {} })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .catch(() => {});
    this.selectedTargetGroup = {};

    //Do not do this at home!
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    //@ts-ignore
    this.$refs.targetGroupsTable["$children"][0].clearSelected();
  }

  onRowSelected(targetGroups: TargetGroupWithRegion[]) {
    if (targetGroups.length > 0) {
      this.selectedTargetGroup = targetGroups[0];
      this.drawerOpened = true;
      this.$router
        .push({
          path: "/ec2/targetGroups",
          query: { targetGroupArn: targetGroups[0].TargetGroupArn },
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
      this.targetGroupsAsList.forEach((targetGroup) => {
        if (
          targetGroup.region &&
          removedRegions.includes(targetGroup.region) &&
          targetGroup.TargetGroupArn
        ) {
          this.$delete(this.targetGroups, targetGroup.TargetGroupArn);
        }
      });
    }

    addedRegions.forEach((region) => this.getTargetGroupForRegion(region));
  }

  beforeMount() {
    this.getAllTargetGroups();
  }

  @Watch("currentRoleIndex")
  onCurrentRoleIndexChanged() {
    this.targetGroups = {};
    this.getAllTargetGroups();
  }

  destroyed() {
    this.$store.commit("notifications/dismissByKey", "loadingTargetGroup");
  }
}
</script>

<style scoped></style>
