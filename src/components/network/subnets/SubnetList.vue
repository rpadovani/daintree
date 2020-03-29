<template>
  <div>
    <Header v-on:refresh="getAllSubnets" :loading="loadingCount > 0" />

    <gl-drawer
      :open="drawerOpened && selectedSubnet !== {}"
      @close="close"
      style="width:80%"
    >
      <template #header>{{ selectedSubnetTitle }}</template>

      <subnet :subnet="selectedSubnet" v-on:deleted="close" />
    </gl-drawer>

    <div class="container-fluid">
      <div
        class="row justify-content-between mt-3 mb-2 ml-2 mr-2"
        v-if="subnetsAsList.length > 0"
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
          to="/network/subnets/new"
          >Create new subnet
        </gl-button>
      </div>
      <gl-table
        :items="subnetsAsList"
        :fields="fields"
        :filter="filter"
        :busy="loadingCount > 0"
        ref="subnetsTable"
        selectable
        select-mode="single"
        @row-selected="onRowSelected"
        v-show="subnetsAsList.length > 0"
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
        <template v-slot:cell(state)="data">
          <StateText :state="data.value" />
        </template>
        <template v-slot:cell(AvailabilityZone)="data">
          <RegionText :region="data.value" is-az />
        </template>
        <template v-slot:cell(DefaultForAz)="data">
          <gl-icon v-if="data.value" name="check-circle" />
        </template>
        <template v-slot:cell(VpcId)="data">
          <router-link :to="`/network/vpcs?vpcId=${data.value}`">
            {{ data.value }}
          </router-link>
        </template>
      </gl-table>

      <div class="container">
        <gl-skeleton-loading
          class="mt-5"
          v-if="loadingCount > 0 && subnetsAsList.length < 1"
        />

        <gl-empty-state
          class="mt-5"
          v-if="loadingCount === 0 && subnetsAsList.length === 0"
          title="No subnets found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <gl-button icon="plus" variant="success" to="/network/subnets/new"
              >Create new subnet
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
import AWS from "aws-sdk";

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
import { DescribeSubnetsRequest } from "aws-sdk/clients/ec2";
import Notifications from "@/mixins/notifications";
import { Watch } from "vue-property-decorator";
import Subnet from "@/components/network/subnets/Subnet.vue";
import { Subnets } from "@/components/network/subnets/subnet";
import SubnetWithRegion = Subnets.SubnetWithRegion;

@Component({
  components: {
    StateText,
    Header,
    GlTable,
    RegionText,
    GlIcon,
    GlDrawer,
    Subnet,
    GlButton,
    GlFormInput,
    GlSkeletonLoading,
    GlEmptyState
  },
  directives: {
    "gl-modal-directive": GlModalDirective
  }
})
export default class SubnetList extends mixins(Formatters, Notifications) {
  subnets: { [key: string]: SubnetWithRegion } = {};

  drawerOpened = false;

  selectedSubnet: SubnetWithRegion = {};
  filter = "";
  loadingCount = 0;

  //A list of Subnets that are being created or deleted by region. We poll over them.
  wipSubnets: { [key: string]: string[] } = {};
  isPolling = false;

  fields = [
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: this.extractNameFromTags
    },
    { key: "SubnetId", sortable: true },
    "State",
    { key: "CidrBlock", sortable: true },
    { key: "AvailabilityZone", sortable: true },
    {
      key: "DefaultForAz",
      label: "Default?",
      class: "text-center"
    },
    { key: "VpcId", sortable: true }
  ];

  get subnetsAsList(): SubnetWithRegion[] {
    return Object.values(this.subnets);
  }

  get regionsEnabled(): string[] {
    return this.$store.getters["sts/regions"];
  }

  get currentRoleIndex(): number {
    return this.$store.getters["sts/currentRoleIndex"];
  }

  get emptyStateDescription(): string {
    return (
      "Daintree hasn't found any subnet in the selected regions! You can create a new one, or change selected regions in the settings. We have looked in " +
      this.regionsEnabled.join(", ") +
      "."
    );
  }

  get selectedSubnetTitle() {
    const nameTag = this.selectedSubnet?.Tags?.filter(v => v.Key === "Name");

    if (nameTag && nameTag.length > 0) {
      return `${nameTag[0].Value} (${this.selectedSubnet?.SubnetId})`;
    }

    return this.selectedSubnet?.SubnetId;
  }

  getAllSubnets() {
    this.regionsEnabled.forEach(region => this.getSubnetForRegion(region));
  }

  getSubnetForRegion(region: string, filterBySubnetsId?: string[]) {
    //While polling we do not set the loading state 'cause it is annoying
    if (!filterBySubnetsId) {
      this.loadingCount++;
    }

    const EC2 = new AWS.EC2({ region });
    const params: DescribeSubnetsRequest = {};
    if (filterBySubnetsId) {
      params.Filters = [
        {
          Name: "subnet-id",
          Values: filterBySubnetsId
        }
      ];
    }
    EC2.describeSubnets(params, (err, data) => {
      if (!filterBySubnetsId) {
        this.loadingCount--;
        Object.keys(this.subnets).forEach(key => {
          //Keep track if the subnets of this region are still available
          if (this.subnets[key].region === region) {
            this.subnets[key].stillPresent = false;
          }
        });
      }

      if (err) {
        this.showError(`[${region}] ` + err, "loadingSubnet");
        return;
      }

      //When we retrieve only some subnets, if we don't retrieve them it means they have been deleted
      if (filterBySubnetsId) {
        const retrievedIds = data.Subnets?.map(v => v.SubnetId);

        filterBySubnetsId.forEach(idFiltered => {
          if (!retrievedIds || !retrievedIds.includes(idFiltered)) {
            this.$delete(this.subnets, idFiltered);
          }
        });
      }

      data.Subnets?.forEach(subnet => {
        if (subnet.SubnetId) {
          this.$set(this.subnets, subnet.SubnetId, {
            ...subnet,
            region,
            stillPresent: true
          });

          //If subnets are pending or deleting we save them in the wip subnets, so we can poll over them
          //Otherwise, if they are not pending nor deleting, we remove them from the wip state
          if (subnet.State && ["pending", "deleting"].includes(subnet.State)) {
            if (!this.wipSubnets[region]) {
              this.$set(this.wipSubnets, region, [subnet.SubnetId]);
            } else if (!this.wipSubnets[region].includes(subnet.SubnetId)) {
              this.wipSubnets[region].push(subnet.SubnetId);
            }
            this.startPolling();
          } else if (
            this.wipSubnets[region] &&
            this.wipSubnets[region].includes(subnet.SubnetId)
          ) {
            const subnetIndex = this.wipSubnets[region].findIndex(
              v => v === subnet.SubnetId
            );
            //If we were creating or deleting a subnet gateway on our own, we dismiss the creating / deleting
            //NAT alert
            this.dismissAlertByResourceID(subnet.SubnetId);
            this.wipSubnets[region].slice(subnetIndex, subnetIndex + 1);
          }
        }
      });

      //Remove subnets we don't find anymore
      if (!filterBySubnetsId) {
        Object.keys(this.subnets).forEach(key => {
          if (
            this.subnets[key].region === region &&
            !this.subnets[key].stillPresent
          ) {
            this.$delete(this.subnets, key);
          }
        });
      }

      //We wait until all the data have been loaded and then we select the row on the table.
      //This is necessary because every time the data of the table is updated, a row selected event with
      //0 elements is emitted, removing our selection
      if (this.$route.query.subnetId && this.loadingCount === 0) {
        this.$nextTick().then(() => {
          const filteredSubnets = this.subnetsAsList.filter(
            subnet => subnet.SubnetId === this.$route.query.subnetId
          );
          if (filteredSubnets && filteredSubnets.length > 0) {
            this.selectedSubnet = filteredSubnets[0];
            this.drawerOpened = true;
            const index = this.subnetsAsList.findIndex(
              subnet => subnet.SubnetId === this.$route.query.subnetId
            );
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            //@ts-ignore
            this.$refs.subnetsTable["$children"][0].selectRow(index);
          }
        });
      }
    });
  }

  close() {
    this.drawerOpened = false;

    if (this.selectedSubnet.region && this.selectedSubnet.SubnetId) {
      this.getSubnetForRegion(this.selectedSubnet.region, [
        this.selectedSubnet.SubnetId
      ]);
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.$router.push({ path: "/network/subnets", query: {} }).catch(() => {});
    this.selectedSubnet = {};

    //Do not do this at home!
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    //@ts-ignore
    this.$refs.subnetsTable["$children"][0].clearSelected();
  }

  onRowSelected(subnets: SubnetWithRegion[]) {
    if (subnets.length > 0) {
      this.selectedSubnet = subnets[0];
      this.drawerOpened = true;
      this.$router
        .push({
          path: "/network/subnets",
          query: { subnetId: subnets[0].SubnetId }
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
      this.subnetsAsList.forEach(subnet => {
        if (
          subnet.region &&
          removedRegions.includes(subnet.region) &&
          subnet.SubnetId
        ) {
          this.$delete(this.subnets, subnet.SubnetId);
        }
      });
    }

    addedRegions.forEach(region => this.getSubnetForRegion(region));
  }

  startPolling() {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;
    window.setTimeout(() => {
      this.isPolling = false;

      Object.keys(this.wipSubnets).forEach(region => {
        if (this.wipSubnets[region].length > 0) {
          this.getSubnetForRegion(region, this.wipSubnets[region]);
        }
      });
    }, 5000);
  }

  @Watch("currentRoleIndex")
  onCurrentRoleIndexChanged() {
    this.subnets = {};
    this.getAllSubnets();
  }

  beforeMount() {
    this.getAllSubnets();
  }

  destroyed() {
    this.$store.commit("notifications/dismissByKey", "loadingSubnet");
  }
}
</script>

<style scoped></style>
