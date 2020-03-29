<template>
  <div>
    <Header v-on:refresh="getAllNats" :loading="loadingCount > 0" />

    <gl-drawer
      :open="drawerOpened && selectedNat !== {}"
      @close="close"
      style="width:80%"
    >
      <template #header>{{ selectedNatTitle }}</template>

      <Nat :nat="selectedNat" v-on:deleted="() => close(true)" />
    </gl-drawer>

    <div class="container-fluid">
      <div
        class="row justify-content-between mt-3 mb-2 ml-2 mr-2"
        v-if="natsAsList.length > 0"
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
          to="/network/nats/new"
          >Create new
        </gl-button>
      </div>
      <gl-table
        :items="natsAsList"
        :fields="fields"
        :filter="filter"
        :busy="loadingCount > 0"
        ref="natsTable"
        selectable
        select-mode="single"
        @row-selected="onRowSelected"
        v-show="natsAsList.length > 0"
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
        <template v-slot:cell(publicIp)="data">
          {{ data.item.NatGatewayAddresses.map(el => el.PublicIp).join(", ") }}
        </template>
        <template v-slot:cell(privateIp)="data">
          {{ data.item.NatGatewayAddresses.map(el => el.PrivateIp).join(", ") }}
        </template>
        <template v-slot:cell(VpcId)="data">
          <router-link :to="`/network/vpcs?vpcId=${data.value}`">
            {{ data.value }}
          </router-link>
        </template>
        <template v-slot:cell(SubnetId)="data">
          <router-link :to="`/network/subnets?subnetId=${data.value}`">
            {{ data.value }}
          </router-link>
        </template>
      </gl-table>

      <div class="container">
        <gl-skeleton-loading
          class="mt-5"
          v-if="loadingCount > 0 && natsAsList.length < 1"
        />

        <gl-empty-state
          class="mt-5"
          v-if="loadingCount === 0 && natsAsList.length === 0"
          title="No Nat Gateways found in the selected regions!"
          svg-path="/assets/undraw_empty_xct9.svg"
          :description="emptyStateDescription"
          compact
        >
          <template #actions>
            <gl-button icon="plus" variant="success" to="/network/nats/new"
              >Create new Nat Gateway
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
import Nat from "./Nat.vue";
import RegionText from "@/components/common/RegionText.vue";
import {
  GlDrawer,
  GlEmptyState,
  GlFormInput,
  GlModalDirective,
  GlButton,
  GlSkeletonLoading,
  GlTable
} from "@gitlab/ui";
import { Component, Watch } from "vue-property-decorator";
import { Formatters } from "@/mixins/formatters";
import { nats } from "@/components/network/NAT/nat";
import NatWithRegion = nats.NatWithRegion;
import { DescribeNatGatewaysRequest } from "aws-sdk/clients/ec2";
import StateText from "@/components/common/StateText.vue";
import Notifications from "@/mixins/notifications";
import { mixins } from "vue-class-component";

@Component({
  components: {
    StateText,
    Header,
    GlTable,
    RegionText,
    GlDrawer,
    GlButton,
    GlFormInput,
    Nat,
    GlSkeletonLoading,
    GlEmptyState
  },
  directives: {
    "gl-modal-directive": GlModalDirective
  }
})
export default class NatList extends mixins(Formatters, Notifications) {
  nats: { [key: string]: NatWithRegion } = {};

  drawerOpened = false;

  selectedNat: NatWithRegion = {};
  filter = "";
  loadingCount = 0;

  //A list of NATs that are being created or deleted by region. We poll over them.
  wipNats: { [key: string]: string[] } = {};
  isPolling = false;

  fields = [
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: this.extractNameFromTags
    },
    { key: "NatGatewayId", sortable: true },
    "State",
    { key: "publicIp", sortable: true },
    { key: "privateIp", sortable: true },
    { key: "region", sortable: true },
    { key: "VpcId", sortable: true },
    { key: "SubnetId", sortable: true }
  ];

  get natsAsList(): NatWithRegion[] {
    return Object.values(this.nats);
  }

  get regionsEnabled(): string[] {
    return this.$store.getters["sts/regions"];
  }

  get currentRoleIndex(): number {
    return this.$store.getters["sts/currentRoleIndex"];
  }

  get emptyStateDescription(): string {
    return (
      "Daintree hasn't found any Nat Gateway in the selected regions! You can create a new one, or change selected regions in the settings. We have looked in " +
      this.$store.getters["sts/regions"].join(", ") +
      "."
    );
  }

  get selectedNatTitle() {
    const nameTag = this.selectedNat?.Tags?.filter(v => v.Key === "Name");

    if (nameTag && nameTag.length > 0) {
      return `${nameTag[0].Value} (${this.selectedNat.NatGatewayId})`;
    }
    return this.selectedNat.NatGatewayId;
  }

  getAllNats() {
    this.regionsEnabled.forEach(region => this.getNatForRegion(region));
  }

  getNatForRegion(region: string, filterByNatsId?: string[]) {
    //While polling we do not set the loading state 'cause it is annoying
    if (!filterByNatsId) {
      this.loadingCount++;
    }
    const EC2 = new AWS.EC2({ region });
    const params: DescribeNatGatewaysRequest = {};
    if (filterByNatsId) {
      params.Filter = [
        {
          Name: "nat-gateway-id",
          Values: filterByNatsId
        }
      ];
    }

    EC2.describeNatGateways(params, (err, data) => {
      if (!filterByNatsId) {
        this.loadingCount--;
        Object.keys(this.nats).forEach(key => {
          //Keep track if the nats of this region are still available
          if (this.nats[key].region === region) {
            this.nats[key].stillPresent = false;
          }
        });
      }
      if (err) {
        this.showError(`[${region}] ` + err, "loadingNat");
        return;
      }

      //When we retrieve only some NATs, if we don't retrieve them it means they have been deleted
      if (filterByNatsId) {
        const retrievedIds = data.NatGateways?.map(n => n.NatGatewayId);

        filterByNatsId.forEach(idFiltered => {
          if (!retrievedIds || !retrievedIds.includes(idFiltered)) {
            this.$delete(this.nats, idFiltered);
          }
        });
      }

      data.NatGateways?.forEach(nat => {
        if (nat.NatGatewayId) {
          this.$set(this.nats, nat.NatGatewayId, {
            ...nat,
            region,
            stillPresent: true
          });

          //If nats are pending or deleting we save them in the wip nats, so we can poll over them
          //Otherwise, if they are not pending nor deleting, we remove them from the wip state
          if (nat.State && ["pending", "deleting"].includes(nat.State)) {
            if (!this.wipNats[region]) {
              this.$set(this.wipNats, region, [nat.NatGatewayId]);
            } else if (!this.wipNats[region].includes(nat.NatGatewayId)) {
              this.wipNats[region].push(nat.NatGatewayId);
            }
            this.startPolling();
          } else if (
            this.wipNats[region] &&
            this.wipNats[region].includes(nat.NatGatewayId)
          ) {
            const natIndex = this.wipNats[region].findIndex(
              v => v === nat.NatGatewayId
            );
            //If we were creating or deleting a nat gateway on our own, we dismiss the creating / deleting
            //NAT alert
            this.dismissAlertByResourceID(nat.NatGatewayId);
            this.wipNats[region].slice(natIndex, natIndex + 1);
          }
        }
      });

      //Remove nat gateways we don't find anymore
      if (!filterByNatsId) {
        Object.keys(this.nats).forEach(key => {
          if (
            this.nats[key].region === region &&
            !this.nats[key].stillPresent
          ) {
            this.$delete(this.nats, key);
          }
        });
      }

      //We wait until all the data have been loaded and then we select the row on the table.
      //This is necessary because every time the data of the table is updated, a row selected event with
      //0 elements is emitted, removing our selection
      if (this.$route.query.natId && this.loadingCount === 0) {
        this.$nextTick().then(() => {
          const filteredNats = this.natsAsList.filter(
            nat => nat.NatGatewayId === this.$route.query.natId
          );
          if (filteredNats && filteredNats.length > 0) {
            this.selectedNat = filteredNats[0];
            this.drawerOpened = true;
            const index = this.natsAsList.findIndex(
              nat => nat.NatGatewayId === this.$route.query.natId
            );
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            //@ts-ignore
            this.$refs.natsTable["$children"][0].selectRow(index);
          }
        });
      }
    });
  }

  close(update?: boolean) {
    this.drawerOpened = false;

    if (update && this.selectedNat.region && this.selectedNat.NatGatewayId) {
      this.getNatForRegion(this.selectedNat.region, [
        this.selectedNat.NatGatewayId
      ]);
    }

    //We silence the error: it's a "NavigationDuplicate" because we aren't changing component
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.$router.push({ path: "/network/nats", query: {} }).catch(() => {});
    this.selectedNat = {};

    //Do not do this at home!
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    //@ts-ignore
    this.$refs.natsTable["$children"][0].clearSelected();
  }

  onRowSelected(nats: NatWithRegion[]) {
    if (nats.length > 0) {
      this.selectedNat = nats[0];
      this.drawerOpened = true;
      this.$router
        .push({
          path: "/network/nats",
          query: { natId: nats[0].NatGatewayId }
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
      this.natsAsList.forEach(nat => {
        if (
          nat.region &&
          removedRegions.includes(nat.region) &&
          nat.NatGatewayId
        ) {
          this.$delete(this.nats, nat.NatGatewayId);
        }
      });
    }

    addedRegions.forEach(region => this.getNatForRegion(region));
  }

  startPolling() {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;
    window.setTimeout(() => {
      this.isPolling = false;

      Object.keys(this.wipNats).forEach(region => {
        if (this.wipNats[region].length > 0) {
          this.getNatForRegion(region, this.wipNats[region]);
        }
      });
    }, 5000);
  }

  beforeMount() {
    this.getAllNats();
  }

  @Watch("currentRoleIndex")
  onCurrentRoleIndexChanged() {
    this.nats = {};
    this.getAllNats();
  }

  destroyed() {
    this.$store.commit("notifications/dismissByKey", "loadingNat");
  }
}
</script>

<style scoped></style>
