<template>
  <div>
    <Header v-on:refresh="getAllVPCs" :loading="loadingCount > 0" />

    <gl-drawer
      :open="drawerOpened && selectedVpc !== {}"
      @close="close"
      style="width:80%"
    >
      <template #header>{{ selectedVpcTitle }}</template>

      <VPC :vpc="selectedVpc" v-on:deleted="close" />
    </gl-drawer>

    <div class="container-fluid">
      <div
        class="row justify-content-between mt-3 mb-2 ml-2 mr-2"
        v-if="vpcsAsList.length > 0"
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
          to="/network/vpcs/new"
          >Create new VPC
        </gl-button>
      </div>
      <gl-table
        :items="vpcsAsList"
        :fields="fields"
        :filter="filter"
        :busy="loadingCount > 0"
        ref="vpcsTable"
        selectable
        select-mode="single"
        @row-selected="onRowSelected"
        v-show="vpcsAsList.length > 0"
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
        <template v-slot:cell(IsDefault)="data">
          <gl-icon v-if="data.value" name="check-circle" />
        </template>
      </gl-table>

      <div class="container">
        <gl-skeleton-loading
          class="mt-5"
          v-if="loadingCount > 0 && vpcsAsList.length < 1"
        />

        <gl-empty-state
          class="mt-5"
          v-if="loadingCount === 0 && vpcsAsList.length === 0"
          title="No Vpc found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <gl-button icon="plus" variant="success" to="/network/vpcs/new"
              >Create new VPC
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
import { vpcs } from "@/components/network/VPC/vpc";
import VpcWithRegion = vpcs.VpcWithRegion;
import VPC from "@/components/network/VPC/VPC.vue";
import StateText from "@/components/common/StateText.vue";
import { DescribeVpcsRequest } from "aws-sdk/clients/ec2";
import Notifications from "@/mixins/notifications";
import { Watch } from "vue-property-decorator";

@Component({
  components: {
    StateText,
    Header,
    GlTable,
    RegionText,
    GlIcon,
    GlDrawer,
    VPC,
    GlButton,
    GlFormInput,
    GlSkeletonLoading,
    GlEmptyState
  },
  directives: {
    "gl-modal-directive": GlModalDirective
  }
})
export default class VPCList extends mixins(Formatters, Notifications) {
  vpcs: { [key: string]: VpcWithRegion } = {};

  drawerOpened = false;

  selectedVpc: VpcWithRegion = {};
  filter = "";
  loadingCount = 0;

  //A list of Vpcs that are being created or deleted by region. We poll over them.
  wipVpcs: { [key: string]: string[] } = {};
  isPolling = false;

  fields = [
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: this.extractNameFromTags
    },
    { key: "VpcId", sortable: true },
    "State",
    { key: "CidrBlock", sortable: true },
    { key: "region", sortable: true },
    {
      key: "IsDefault",
      label: "Default?",
      class: "text-center"
    },
    { key: "DhcpOptionsId", sortable: true }
  ];

  get vpcsAsList(): VpcWithRegion[] {
    return Object.values(this.vpcs);
  }

  get regionsEnabled(): string[] {
    return this.$store.getters["sts/regions"];
  }

  get currentRoleIndex(): number {
    return this.$store.getters["sts/currentRoleIndex"];
  }

  get emptyStateDescription(): string {
    return (
      "Daintree hasn't found any Vpc in the selected regions! You can create a new one, or change selected regions in the settings. We have looked in " +
      this.regionsEnabled.join(", ") +
      "."
    );
  }

  get selectedVpcTitle() {
    const nameTag = this.selectedVpc?.Tags?.filter(v => v.Key === "Name");

    if (nameTag && nameTag.length > 0) {
      return `${nameTag[0].Value} (${this.selectedVpc?.VpcId})`;
    }

    return this.selectedVpc?.VpcId;
  }
  getAllVPCs() {
    this.regionsEnabled.forEach(region => this.getVpcForRegion(region));
  }

  getVpcForRegion(region: string, filterByVpcsId?: string[]) {
    //While polling we do not set the loading state 'cause it is annoying
    if (!filterByVpcsId) {
      this.loadingCount++;
    }

    const EC2 = new AWS.EC2({ region });
    const params: DescribeVpcsRequest = {};
    if (filterByVpcsId) {
      params.Filters = [
        {
          Name: "vpc-id",
          Values: filterByVpcsId
        }
      ];
    }
    EC2.describeVpcs(params, (err, data) => {
      if (!filterByVpcsId) {
        this.loadingCount--;
        Object.keys(this.vpcs).forEach(key => {
          //Keep track if the vpcs of this region are still available
          if (this.vpcs[key].region === region) {
            this.vpcs[key].stillPresent = false;
          }
        });
      }

      if (err) {
        this.showError(`[${region}] ` + err, "loadingVpc");
        return;
      }

      //When we retrieve only some VPCs, if we don't retrieve them it means they have been deleted
      if (filterByVpcsId) {
        const retrievedIds = data.Vpcs?.map(v => v.VpcId);

        filterByVpcsId.forEach(idFiltered => {
          if (!retrievedIds || !retrievedIds.includes(idFiltered)) {
            this.$delete(this.vpcs, idFiltered);
          }
        });
      }

      data.Vpcs?.forEach(vpc => {
        if (vpc.VpcId) {
          this.$set(this.vpcs, vpc.VpcId, {
            ...vpc,
            region,
            stillPresent: true
          });

          //If vpcs are pending or deleting we save them in the wip vpcs, so we can poll over them
          //Otherwise, if they are not pending nor deleting, we remove them from the wip state
          if (vpc.State && ["pending", "deleting"].includes(vpc.State)) {
            if (!this.wipVpcs[region]) {
              this.$set(this.wipVpcs, region, [vpc.VpcId]);
            } else if (!this.wipVpcs[region].includes(vpc.VpcId)) {
              this.wipVpcs[region].push(vpc.VpcId);
            }
            this.startPolling();
          } else if (
            this.wipVpcs[region] &&
            this.wipVpcs[region].includes(vpc.VpcId)
          ) {
            const vpcIndex = this.wipVpcs[region].findIndex(
              v => v === vpc.VpcId
            );
            //If we were creating or deleting a vpc gateway on our own, we dismiss the creating / deleting
            //NAT alert
            this.dismissAlertByResourceID(vpc.VpcId);
            this.wipVpcs[region].slice(vpcIndex, vpcIndex + 1);
          }
        }
      });

      //Remove VPCs we don't find anymore
      if (!filterByVpcsId) {
        Object.keys(this.vpcs).forEach(key => {
          if (
            this.vpcs[key].region === region &&
            !this.vpcs[key].stillPresent
          ) {
            this.$delete(this.vpcs, key);
          }
        });
      }

      //We wait until all the data have been loaded and then we select the row on the table.
      //This is necessary because every time the data of the table is updated, a row selected event with
      //0 elements is emitted, removing our selection
      if (this.$route.query.vpcId && this.loadingCount === 0) {
        this.$nextTick().then(() => {
          const filteredVpcs = this.vpcsAsList.filter(
            vpc => vpc.VpcId === this.$route.query.vpcId
          );
          if (filteredVpcs && filteredVpcs.length > 0) {
            this.selectedVpc = filteredVpcs[0];
            this.drawerOpened = true;
            const index = this.vpcsAsList.findIndex(
              vpc => vpc.VpcId === this.$route.query.vpcId
            );
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            //@ts-ignore
            this.$refs.vpcsTable["$children"][0].selectRow(index);
          }
        });
      }
    });
  }

  close() {
    this.drawerOpened = false;

    if (this.selectedVpc.region && this.selectedVpc.VpcId) {
      this.getVpcForRegion(this.selectedVpc.region, [this.selectedVpc.VpcId]);
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.$router.push({ path: "/network/vpcs", query: {} }).catch(() => {});
    this.selectedVpc = {};

    //Do not do this at home!
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    //@ts-ignore
    this.$refs.vpcsTable["$children"][0].clearSelected();
  }

  onRowSelected(vpcs: VpcWithRegion[]) {
    if (vpcs.length > 0) {
      this.selectedVpc = vpcs[0];
      this.drawerOpened = true;
      this.$router
        .push({
          path: "/network/vpcs",
          query: { vpcId: vpcs[0].VpcId }
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
      this.vpcsAsList.forEach(vpc => {
        if (vpc.region && removedRegions.includes(vpc.region) && vpc.VpcId) {
          this.$delete(this.vpcs, vpc.VpcId);
        }
      });
    }

    addedRegions.forEach(region => this.getVpcForRegion(region));
  }

  startPolling() {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;
    window.setTimeout(() => {
      this.isPolling = false;

      Object.keys(this.wipVpcs).forEach(region => {
        if (this.wipVpcs[region].length > 0) {
          this.getVpcForRegion(region, this.wipVpcs[region]);
        }
      });
    }, 5000);
  }

  @Watch("currentRoleIndex")
  onCurrentRoleIndexChanged() {
    this.vpcs = {};
    this.getAllVPCs();
  }

  beforeMount() {
    this.getAllVPCs();
  }

  destroyed() {
    this.$store.commit("notifications/dismissByKey", "loadingVpc");
  }
}
</script>

<style scoped></style>
