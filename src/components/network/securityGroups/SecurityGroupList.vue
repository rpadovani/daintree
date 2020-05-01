<template>
  <div>
    <Header v-on:refresh="getAllSecurityGroups" :loading="loadingCount > 0" />

    <gl-drawer
      :open="drawerOpened && selectedSecurityGroup !== {}"
      @close="close"
      style="width:80%"
    >
      <template #header>{{ selectedSecurityGroupTitle }}</template>

      <SecurityGroup
        :securityGroup="selectedSecurityGroup"
        v-on:deleted="close"
      />
    </gl-drawer>

    <div class="container-fluid">
      <div
        class="row justify-content-between mt-3 mb-2 ml-2 mr-2"
        v-if="securityGroupsAsList.length > 0"
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
          to="/network/securityGroups/new"
          >Create new security group
        </gl-button>
      </div>
      <gl-table
        :items="securityGroupsAsList"
        :fields="fields"
        :filter="filter"
        :busy="loadingCount > 0"
        ref="securityGroupsTable"
        selectable
        select-mode="single"
        @row-selected="onRowSelected"
        v-show="securityGroupsAsList.length > 0"
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
        <template v-slot:cell(VpcId)="data">
          <router-link :to="`/network/vpcs?vpcId=${data.value}`">
            {{ data.value }}
          </router-link>
        </template>
        <template v-slot:cell(region)="data">
          <RegionText :region="data.value" />
        </template>
      </gl-table>

      <div class="container">
        <gl-skeleton-loading
          class="mt-5"
          v-if="loadingCount > 0 && securityGroupsAsList.length < 1"
        />

        <gl-empty-state
          class="mt-5"
          v-if="loadingCount === 0 && securityGroupsAsList.length === 0"
          title="No SecurityGroup found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <gl-button
              icon="plus"
              variant="success"
              to="/network/securityGroups/new"
              >Create new security group
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
import RegionText from "@/components/common/RegionText.vue";
import {
  GlDrawer,
  GlFormInput,
  GlIcon,
  GlButton,
  GlTable,
  GlEmptyState,
  GlSkeletonLoading,
  GlModalDirective
} from "@gitlab/ui";
import { Formatters } from "@/mixins/formatters";
import Component, { mixins } from "vue-class-component";
import StateText from "@/components/common/StateText.vue";
import {
  DescribeSecurityGroupsRequest,
  IpPermission
} from "aws-sdk/clients/ec2";
import Notifications from "@/mixins/notifications";
import { Watch } from "vue-property-decorator";
import { securityGroups } from "@/components/network/securityGroups/securityGroup";
import SecurityGroupWithRegion = securityGroups.SecurityGroupWithRegion;
import SecurityGroup from "@/components/network/securityGroups/SecurityGroup.vue";
import { Route } from "vue-router";

@Component({
  components: {
    StateText,
    Header,
    GlTable,
    RegionText,
    GlIcon,
    GlDrawer,
    SecurityGroup,
    GlButton,
    GlFormInput,
    GlSkeletonLoading,
    GlEmptyState
  },
  directives: {
    "gl-modal-directive": GlModalDirective
  }
})
export default class SecurityGroupList extends mixins(
  Formatters,
  Notifications
) {
  securityGroups: { [key: string]: SecurityGroupWithRegion } = {};

  drawerOpened = false;

  selectedSecurityGroup: SecurityGroupWithRegion = {};
  filter = "";
  loadingCount = 0;

  fields = [
    {
      key: "GroupName",
      label: "Name",
      sortable: true
    },
    { key: "GroupId", label: "Security group ID", sortable: true },
    { key: "region", sortable: true },
    { key: "VpcId", sortable: true },
    {
      key: "IpPermissions",
      label: "# inbound rules",
      formatter: (value: IpPermission[]) => value.length
    },
    {
      key: "IpPermissionsEgress",
      label: "# outbound rules",
      formatter: (value: IpPermission[]) => value.length
    }
  ];

  get securityGroupsAsList(): SecurityGroupWithRegion[] {
    return Object.values(this.securityGroups);
  }

  get regionsEnabled(): string[] {
    return this.$store.getters["sts/regions"];
  }

  get currentRoleIndex(): number {
    return this.$store.getters["sts/currentRoleIndex"];
  }

  get credentials() {
    return this.$store.getters["sts/credentials"];
  }

  get emptyStateDescription(): string {
    return (
      "Daintree hasn't found any security group in the selected regions! You can create a new one, or change selected regions in the settings. We have looked in " +
      this.regionsEnabled.join(", ") +
      "."
    );
  }

  get selectedSecurityGroupTitle() {
    if (this.selectedSecurityGroup.GroupName) {
      return `${this.selectedSecurityGroup.GroupName} (${this.selectedSecurityGroup?.GroupId})`;
    }

    return this.selectedSecurityGroup?.GroupId;
  }

  getAllSecurityGroups() {
    this.regionsEnabled.forEach(region =>
      this.getSecurityGroupForRegion(region)
    );
  }

  getSecurityGroupForRegion(region: string) {
    this.loadingCount++;

    const EC2 = new EC2Client({ region, credentials: this.credentials });
    const params: DescribeSecurityGroupsRequest = {};

    EC2.describeSecurityGroups(params, (err, data) => {
      this.loadingCount--;

      if (err) {
        this.showError(`[${region}] ` + err, "loadingSecurityGroup");
        return;
      }

      Object.keys(this.securityGroups).forEach(key => {
        //Keep track if the securityGroups of this region are still available
        if (this.securityGroups[key].region === region) {
          this.securityGroups[key].stillPresent = false;
        }
      });

      data.SecurityGroups?.forEach(securityGroup => {
        if (securityGroup.GroupId) {
          this.$set(this.securityGroups, securityGroup.GroupId, {
            ...securityGroup,
            region,
            stillPresent: true
          });
        }
      });

      //Remove SecurityGroups we don't find anymore
      Object.keys(this.securityGroups).forEach(key => {
        if (
          this.securityGroups[key].region === region &&
          !this.securityGroups[key].stillPresent
        ) {
          this.$delete(this.securityGroups, key);
        }
      });

      //We wait until all the data have been loaded and then we select the row on the table.
      //This is necessary because every time the data of the table is updated, a row selected event with
      //0 elements is emitted, removing our selection
      if (this.$route.query.securityGroupId && this.loadingCount === 0) {
        this.$nextTick().then(() => {
          this.selectSecurityGroupBasedOnParameter();
        });
      }
    });
  }

  selectSecurityGroupBasedOnParameter() {
    if (!this.$route.query.securityGroupId) {
      return;
    }

    const filteredSecurityGroups = this.securityGroupsAsList.filter(
      securityGroup =>
        securityGroup.GroupId === this.$route.query.securityGroupId
    );
    if (
      filteredSecurityGroups &&
      filteredSecurityGroups.length > 0 &&
      filteredSecurityGroups[0].GroupId !== this.selectedSecurityGroup.GroupId
    ) {
      this.selectedSecurityGroup = filteredSecurityGroups[0];
      this.drawerOpened = true;
      const index = this.securityGroupsAsList.findIndex(
        securityGroup =>
          securityGroup.GroupId === this.$route.query.securityGroupId
      );
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      //@ts-ignore
      this.$refs.securityGroupsTable["$children"][0].selectRow(index);
    }
  }

  close() {
    this.drawerOpened = false;

    if (
      this.selectedSecurityGroup.region &&
      this.selectedSecurityGroup.GroupId
    ) {
      //We do not filter by table id because it could be that the main table has changed
      this.getSecurityGroupForRegion(this.selectedSecurityGroup.region);
    }

    this.$router
      .push({ path: "/network/securityGroups", query: {} })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .catch(() => {});
    this.selectedSecurityGroup = {};

    //Do not do this at home!s
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    //@ts-ignore
    this.$refs.securityGroupsTable["$children"][0].clearSelected();
  }

  onRowSelected(securityGroups: SecurityGroupWithRegion[]) {
    if (securityGroups.length > 0) {
      this.selectedSecurityGroup = securityGroups[0];
      this.drawerOpened = true;
      this.$router
        .push({
          path: "/network/securityGroups",
          query: { securityGroupId: securityGroups[0].GroupId }
        })
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .catch(() => {});
    } else {
      this.close();
    }
  }

  @Watch("regionsEnabled")
  onRegionsEnabledChanged(newValue: string[], oldValue: string[]) {
    const addedRegions = [...newValue.filter(d => !oldValue.includes(d))];
    const removedRegions = [...oldValue.filter(d => !newValue.includes(d))];

    if (removedRegions.length > 0) {
      this.securityGroupsAsList.forEach(securityGroup => {
        if (
          securityGroup.region &&
          removedRegions.includes(securityGroup.region) &&
          securityGroup.GroupId
        ) {
          this.$delete(this.securityGroups, securityGroup.GroupId);
        }
      });
    }

    addedRegions.forEach(region => this.getSecurityGroupForRegion(region));
  }

  @Watch("currentRoleIndex")
  onCurrentRoleIndexChanged() {
    this.securityGroups = {};
    this.getAllSecurityGroups();
  }

  @Watch("$route")
  onRouteChanged(newRoute: Route, oldRoute: Route) {
    if (newRoute.query.securityGroupId !== oldRoute.query.securityGroupId) {
      this.selectSecurityGroupBasedOnParameter();
    }
  }

  beforeMount() {
    this.getAllSecurityGroups();
  }

  destroyed() {
    this.$store.commit("notifications/dismissByKey", "loadingSecurityGroup");
  }
}
</script>

<style scoped></style>
