<template>
  <div>
    <Header v-on:refresh="getAllInstances" :loading="loadingCount > 0" />

    <gl-drawer
      :open="drawerOpened && selectedInstance !== {}"
      @close="close"
      style="min-width: 80%;"
    >
      <template #header>{{ selectedInstanceTitle }}</template>

      <Instance :instance="selectedInstance" />
    </gl-drawer>

    <div class="container-fluid">
      <div
        class="row justify-content-between mt-3 mb-2 ml-2 mr-2"
        v-if="instancesAsList.length > 0"
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
          href="#/ec2/instances/new"
          v-if="false"
          >Launch a new instance</gl-button
        >
      </div>

      <gl-table
        ref="instancesTable"
        :items="instancesAsList"
        :fields="fields"
        :filter="filter"
        :busy="loadingCount > 0"
        selectable
        select-mode="single"
        @row-selected="onRowSelected"
        v-show="instancesAsList.length > 0"
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
          <StateText :state="data.value.Name" />
        </template>
        <template v-slot:cell(placement)="data">
          <RegionText :region="data.value" is-az />
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
    </div>

    <div class="container">
      <gl-skeleton-loading
        class="mt-5"
        v-if="loadingCount > 0 && instancesAsList.length < 1"
      />

      <gl-empty-state
        class="mt-5"
        v-if="loadingCount === 0 && instancesAsList.length === 0"
        title="No instances found in the selected regions!"
        svg-path="/assets/undraw_empty_xct9.svg"
        :description="emptyStateDescription"
        compact
      >
        <template #actions>
          <gl-button
            v-if="false"
            icon="plus"
            variant="success"
            to="/network/instances/new"
            >Launch new instance
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
import EC2Client from "aws-sdk/clients/ec2";
import Header from "../../Header/Header.vue";
import Instance from "./Instance.vue";
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
import { instances } from "@/components/EC2/instances/instance";
import InstanceWithRegion = instances.InstanceWithRegion;
import { DescribeInstancesRequest, Placement } from "aws-sdk/clients/ec2";
import { mixins } from "vue-class-component";
import Notifications from "@/mixins/notifications";

@Component({
  components: {
    Header,
    GlTable,
    GlDrawer,
    GlFormInput,
    GlButton,
    Instance,
    StateText,
    RegionText,
    GlSkeletonLoading,
    GlEmptyState,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
  },
})
export default class Instances extends mixins(Formatters, Notifications) {
  instances: { [key: string]: InstanceWithRegion } = {};
  selectedInstance: InstanceWithRegion = {};
  drawerOpened = false;

  filter = "";
  loadingCount = 0;

  //A list of instances that are being created or deleted by region. We poll over them.
  wipInstances: { [key: string]: string[] } = {};
  isPolling = false;

  fields = [
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: this.extractNameFromTags,
    },
    {
      key: "InstanceId",
      sortable: true,
    },

    {
      key: "InstanceType",
      sortable: true,
    },
    {
      key: "KeyName",
      sortable: true,
      label: "SSH Key Name",
    },
    "State",
    {
      key: "Placement",
      formatter: (placement: Placement) => placement.AvailabilityZone,
    },
    { key: "VpcId", sortable: true },
    { key: "SubnetId", sortable: true },
  ];

  get instancesAsList(): InstanceWithRegion[] {
    return Object.values(this.instances);
  }

  get regionsEnabled(): string[] {
    return this.$store.getters["sts/regions"];
  }

  get currentRoleIndex(): number {
    return this.$store.getters["sts/currentRoleIndex"];
  }

  get emptyStateDescription(): string {
    return (
      "Daintree hasn't found any instance in the selected regions! You can change selected regions in the settings. We have looked in " +
      this.$store.getters["sts/regions"].join(", ") +
      "."
    );
  }

  get selectedInstanceTitle(): string | undefined {
    const nameTag = this.selectedInstance?.Tags?.filter(
      (v) => v.Key === "Name"
    );

    if (nameTag && nameTag.length > 0) {
      return `${nameTag[0].Value} (${this.selectedInstance.InstanceId})`;
    }
    return this.selectedInstance.InstanceId;
  }

  getAllInstances() {
    this.regionsEnabled.forEach((region) => this.getInstanceForRegion(region));
  }
  getInstanceForRegion(region: string, filterByInstanceIds?: string[]) {
    //While polling we do not set the loading state 'cause it is annoying
    if (!filterByInstanceIds) {
      this.loadingCount++;
    }

    const EC2 = new EC2Client({
      region,
      credentials: this.$store.getters["sts/credentials"],
    });
    const params: DescribeInstancesRequest = {};
    if (filterByInstanceIds) {
      params.Filters = [
        {
          Name: "instance-id",
          Values: filterByInstanceIds,
        },
      ];
    }

    EC2.describeInstances(params, (err, data) => {
      if (!filterByInstanceIds) {
        this.loadingCount--;
        Object.keys(this.instances).forEach((key) => {
          //Keep track if the instances of this region are still available
          if (this.instances[key].region === region) {
            this.instances[key].stillPresent = false;
          }
        });
      }

      if (err) {
        this.showError(`[${region}] ` + err, "loadingInstance");
        return;
      }

      data.Reservations?.forEach((r) => {
        r.Instances?.forEach((instance) => {
          if (instance.InstanceId) {
            this.$set(this.instances, instance.InstanceId, {
              ...instance,
              region,
              stillPresent: true,
            });

            //If instances are pending or deleting we save them in the wip instances, so we can poll over them
            //Otherwise, if they are not pending nor deleting, we remove them from the wip state
            if (
              instance.State &&
              instance.State.Name &&
              ["pending", "stopping", "shutting-down"].includes(
                instance.State.Name
              )
            ) {
              if (!this.wipInstances[region]) {
                this.$set(this.wipInstances, region, [instance.InstanceId]);
              } else if (
                !this.wipInstances[region].includes(instance.InstanceId)
              ) {
                this.wipInstances[region].push(instance.InstanceId);
              }
              this.startPolling();
            } else if (
              this.wipInstances[region] &&
              this.wipInstances[region].includes(instance.InstanceId)
            ) {
              const instanceIndex = this.wipInstances[region].findIndex(
                (v) => v === instance.InstanceId
              );
              //If we were creating or deleting a instance on our own, we dismiss the creating / deleting alert
              this.dismissAlertByResourceID(instance.InstanceId);
              this.wipInstances[region].slice(instanceIndex, instanceIndex + 1);
            }
          }
        });
      });

      //Remove instance we don't find anymore
      if (!filterByInstanceIds) {
        Object.keys(this.instances).forEach((key) => {
          if (
            this.instances[key].region === region &&
            !this.instances[key].stillPresent
          ) {
            this.$delete(this.instances, key);
          }
        });
      }

      //We wait until all the data have been loaded and then we select the row on the table.
      //This is necessary because every time the data of the table is updated, a row selected event with
      //0 elements is emitted, removing our selection
      if (this.$route.query.instanceId && this.loadingCount === 0) {
        this.$nextTick().then(() => {
          const filteredInstances = this.instancesAsList.filter(
            (instance) => instance.InstanceId === this.$route.query.instanceId
          );
          if (filteredInstances && filteredInstances.length > 0) {
            this.selectedInstance = filteredInstances[0];
            this.drawerOpened = true;
            const index = this.instancesAsList.findIndex(
              (instance) => instance.InstanceId === this.$route.query.instanceId
            );
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            this.$refs.instancesTable["$children"][0].selectRow(index);
          }
        });
      }
    });
  }

  close(update?: boolean) {
    this.drawerOpened = false;

    if (
      update &&
      this.selectedInstance.region &&
      this.selectedInstance.InstanceId
    ) {
      this.getInstanceForRegion(this.selectedInstance.region, [
        this.selectedInstance.InstanceId,
      ]);
    }

    //We silence the error: it's a "NavigationDuplicate" because we aren't changing component
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.$router.push({ path: "/ec2/instances", query: {} }).catch(() => {});
    this.selectedInstance = {};

    //Do not do this at home!
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    this.$refs.instancesTable["$children"][0].clearSelected();
  }

  onRowSelected(instances: InstanceWithRegion[]) {
    if (instances.length > 0) {
      this.selectedInstance = instances[0];
      this.drawerOpened = true;
      this.$router
        .push({
          path: "/ec2/instances",
          query: { instanceId: instances[0].InstanceId },
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
      this.instancesAsList.forEach((instance) => {
        if (
          instance.region &&
          removedRegions.includes(instance.region) &&
          instance.InstanceId
        ) {
          this.$delete(this.instances, instance.InstanceId);
        }
      });
    }

    addedRegions.forEach((region) => this.getInstanceForRegion(region));
  }

  startPolling() {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;
    window.setTimeout(() => {
      this.isPolling = false;

      Object.keys(this.wipInstances).forEach((region) => {
        if (this.wipInstances[region].length > 0) {
          this.getInstanceForRegion(region, this.wipInstances[region]);
        }
      });
    }, 5000);
  }

  beforeMount() {
    this.getAllInstances();
  }

  @Watch("currentRoleIndex")
  onCurrentRoleIndexChanged() {
    this.instances = {};
    this.getAllInstances();
  }

  destroyed() {
    this.$store.commit("notifications/dismissByKey", "loadingInstance");
  }
}
</script>

<style scoped></style>
