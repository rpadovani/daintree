<template>
  <div>
    <Header v-on:refresh="getAllEips" :loading="loadingCount > 0" />

    <gl-drawer
      :open="drawerOpened && selectedEip !== {}"
      @close="close"
      style="min-width: 80%;"
    >
      <template #header>{{ selectedEipTitle }}</template>

      <Eip
        :eip="selectedEip"
        v-on:disassociated="disassociated"
        v-on:deleted="() => close(true)"
      />
    </gl-drawer>

    <div class="container-fluid">
      <div
        class="row justify-content-between mt-3 mb-2 ml-2 mr-2"
        v-if="eipsAsList.length > 0"
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
          to="/network/eips/new"
          >Allocate new
        </gl-button>
      </div>
      <gl-table
        :items="eipsAsList"
        :fields="fields"
        :filter="filter"
        :busy="loadingCount > 0"
        ref="eipsTable"
        selectable
        select-mode="single"
        @row-selected="onRowSelected"
        v-show="eipsAsList.length > 0"
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
      </gl-table>

      <div class="container">
        <gl-skeleton-loading
          class="mt-5"
          v-if="loadingCount > 0 && eipsAsList.length < 1"
        />

        <gl-empty-state
          class="mt-5"
          v-if="loadingCount === 0 && eipsAsList.length === 0"
          title="No Elastic IP found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <gl-button icon="plus" variant="success" to="/network/eips/new"
              >Allocate new Elastic IP
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
import Eip from "./Eip.vue";
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
import StateText from "@/components/common/StateText.vue";
import Notifications from "@/mixins/notifications";
import { mixins } from "vue-class-component";
import { DescribeAddressesRequest } from "aws-sdk/clients/ec2";
import { eips } from "@/components/network/eips/eip";
import EipWithRegion = eips.EipWithRegion;

@Component({
  components: {
    StateText,
    Header,
    GlTable,
    RegionText,
    GlDrawer,
    GlButton,
    GlFormInput,
    Eip,
    GlSkeletonLoading,
    GlEmptyState,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
  },
})
export default class EipList extends mixins(Formatters, Notifications) {
  eips: { [key: string]: EipWithRegion } = {};

  drawerOpened = false;

  selectedEip: EipWithRegion = {};
  filter = "";
  loadingCount = 0;

  //A list of EIPs that are being created or deleted by region. We poll over them.
  wipEips: { [key: string]: string[] } = {};
  isPolling = false;

  fields = [
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: this.extractNameFromTags,
    },
    { key: "AllocationId", sortable: true },
    { key: "PublicIp", sortable: true },
    { key: "PrivateIpAddress", sortable: true },
    { key: "region", sortable: true },
    { key: "NetworkInterfaceId", sortable: true },
    { key: "InstanceId", sortable: true },
    { key: "AssociationId", sortable: true },
  ];

  get eipsAsList(): EipWithRegion[] {
    return Object.values(this.eips);
  }

  get regionsEnabled(): string[] {
    return this.$store.getters["sts/regions"];
  }

  get currentRoleIndex(): number {
    return this.$store.getters["sts/currentRoleIndex"];
  }

  get emptyStateDescription(): string {
    return (
      "Daintree hasn't found any IP addresses in the selected regions! You can allocate a new one, or change selected regions in the settings. We have looked in " +
      this.$store.getters["sts/regions"].join(", ") +
      "."
    );
  }

  get selectedEipTitle() {
    const nameTag = this.selectedEip?.Tags?.filter((v) => v.Key === "Name");

    if (nameTag && nameTag.length > 0) {
      return `${nameTag[0].Value} (${this.selectedEip.AllocationId})`;
    }
    return this.selectedEip.AllocationId;
  }

  getAllEips() {
    this.regionsEnabled.forEach((region) => this.getEipForRegion(region));
  }

  //When the selected EIP is disassociated, we refresh its state, and it will be propagated down to the tab
  disassociated() {
    if (this.selectedEip.region && this.selectedEip.AllocationId) {
      this.getEipForRegion(this.selectedEip.region, [
        this.selectedEip.AllocationId,
      ]);
    }
  }

  getEipForRegion(region: string, filterByEipsId?: string[]) {
    //While polling we do not set the loading state 'cause it is annoying
    if (!filterByEipsId) {
      this.loadingCount++;
    }
    const EC2 = new EC2Client({
      region,
      credentials: this.$store.getters["sts/credentials"],
    });
    const params: DescribeAddressesRequest = {};
    if (filterByEipsId) {
      params.Filters = [
        {
          Name: "allocation-id",
          Values: filterByEipsId,
        },
      ];
    }

    EC2.describeAddresses(params, (err, data) => {
      if (!filterByEipsId) {
        this.loadingCount--;
        Object.keys(this.eips).forEach((key) => {
          //Keep track if the eips of this region are still available
          if (this.eips[key].region === region) {
            this.eips[key].stillPresent = false;
          }
        });
      }
      if (err) {
        this.showError(`[${region}] ` + err, "loadingEip");
        return;
      }

      //When we retrieve only some EIPs, if we don't retrieve them it means they have been deleted
      if (filterByEipsId) {
        const retrievedIds = data.Addresses?.map((n) => n.AllocationId);

        filterByEipsId.forEach((idFiltered) => {
          if (!retrievedIds || !retrievedIds.includes(idFiltered)) {
            this.$delete(this.eips, idFiltered);
          }
        });
      }

      data.Addresses?.forEach((eip) => {
        if (eip.AllocationId) {
          this.$set(this.eips, eip.AllocationId, {
            ...eip,
            region,
            stillPresent: true,
          });
        }

        //Update also open tab. This happens when the user disassociates a EIP
        if (this.selectedEip.AssociationId === eip.AllocationId) {
          this.selectedEip = eip;
        }
      });

      //Remove eip we don't find anymore
      if (!filterByEipsId) {
        Object.keys(this.eips).forEach((key) => {
          if (
            this.eips[key].region === region &&
            !this.eips[key].stillPresent
          ) {
            this.$delete(this.eips, key);
          }
        });
      }

      //We wait until all the data have been loaded and then we select the row on the table.
      //This is necessary because every time the data of the table is updated, a row selected event with
      //0 elements is emitted, removing our selection
      if (this.$route.query.allocationId && this.loadingCount === 0) {
        this.$nextTick().then(() => {
          const filteredEips = this.eipsAsList.filter(
            (eip) => eip.AllocationId === this.$route.query.allocationId
          );
          if (filteredEips && filteredEips.length > 0) {
            this.selectedEip = filteredEips[0];
            this.drawerOpened = true;
            const index = this.eipsAsList.findIndex(
              (eip) => eip.AllocationId === this.$route.query.allocationId
            );
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            this.$refs.eipsTable["$children"][0].selectRow(index);
          }
        });
      }
    });
  }

  close(update?: boolean) {
    this.drawerOpened = false;

    if (update && this.selectedEip.region && this.selectedEip.AllocationId) {
      this.getEipForRegion(this.selectedEip.region, [
        this.selectedEip.AllocationId,
      ]);
    }

    //We silence the error: it's a "NavigationDuplicate" because we aren't changing component
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.$router.push({ path: "/network/eips", query: {} }).catch(() => {});
    this.selectedEip = {};

    //Do not do this at home!
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    this.$refs.eipsTable["$children"][0].clearSelected();
  }

  onRowSelected(eips: EipWithRegion[]) {
    if (eips.length > 0) {
      this.selectedEip = eips[0];
      this.drawerOpened = true;
      this.$router
        .push({
          path: "/network/eips",
          query: { allocationId: eips[0].AllocationId },
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
      this.eipsAsList.forEach((eip) => {
        if (
          eip.region &&
          removedRegions.includes(eip.region) &&
          eip.AllocationId
        ) {
          this.$delete(this.eips, eip.AllocationId);
        }
      });
    }

    addedRegions.forEach((region) => this.getEipForRegion(region));
  }

  startPolling() {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;
    window.setTimeout(() => {
      this.isPolling = false;

      Object.keys(this.wipEips).forEach((region) => {
        if (this.wipEips[region].length > 0) {
          this.getEipForRegion(region, this.wipEips[region]);
        }
      });
    }, 5000);
  }

  beforeMount() {
    this.getAllEips();
  }

  @Watch("currentRoleIndex")
  onCurrentRoleIndexChanged() {
    this.eips = {};
    this.getAllEips();
  }

  destroyed() {
    this.$store.commit("notifications/dismissByKey", "loadingEip");
  }
}
</script>

<style scoped></style>
