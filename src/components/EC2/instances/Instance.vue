<template>
  <div v-if="instance">
    <div class="col">
      <div class="row">
        <gl-badge v-if="instance.State" :variant="badgeVariant">{{
          instance.State.Name
        }}</gl-badge>

        <gl-badge class="ml-1" variant="info">{{
          instance.InstanceType
        }}</gl-badge>
      </div>
    </div>
    <gl-tabs theme="blue">
      <gl-tab title="Overview">
        <div class="row justify-content-around mt-3">
          <gl-card class="col-3" title="Availability zone">
            <RegionText :region="instance.Placement.AvailabilityZone" is-az />
          </gl-card>
          <gl-card class="col-3" title="VPC ID">
            <router-link :to="`/network/vpcs?vpcId=${instance.VpcId}`">
              {{ instance.VpcId }}
            </router-link></gl-card
          >
          <gl-card class="col-3" title="Subnet ID"
            ><router-link
              :to="`/network/subnets?subnetId=${instance.SubnetId}`"
            >
              {{ instance.SubnetId }}
            </router-link></gl-card
          >
        </div>
        <div class="row justify-content-around mt-3">
          <gl-card class="col-3" title="Image-ID">{{
            instance.ImageId
          }}</gl-card>
          <gl-card class="col-3" title="Launch time">{{
            instance.LaunchTime
          }}</gl-card>
          <gl-card class="col-3" title="Key name">{{
            instance.KeyName
          }}</gl-card>
        </div>

        <h5 v-if="instance.Tags.length > 0" class="mt-3">Tags</h5>
        <gl-table :items="instance.Tags" />
      </gl-tab>
      <gl-tab title="Network">
        <div
          class="row justify-content-around mt-3"
          v-if="instance.PublicIpAddress || instance.PublicDnsName"
        >
          <gl-card
            class="col-5"
            v-if="instance.PublicIpAddress"
            title="Public IP"
            >{{ instance.PublicIpAddress }}</gl-card
          >
          <gl-card
            class="col-5"
            v-if="instance.PublicDnsName"
            title="Public DNS Name"
            >{{ instance.PublicDnsName }}</gl-card
          >
        </div>
        <div
          class="row justify-content-around mt-3"
          v-if="instance.PrivateIpAddress || instance.PrivateDnsName"
        >
          <gl-card
            class="col-5"
            v-if="instance.PrivateIpAddress"
            title="Private IP"
            >{{ instance.PrivateIpAddress }}</gl-card
          >
          <gl-card
            class="col-5"
            v-if="instance.PrivateDnsName"
            title="Private DNS Name"
            >{{ instance.PrivateDnsName }}</gl-card
          >
        </div>

        <h5 class="mt-2">Network interfaces</h5>
        <gl-tabs theme="blue">
          <gl-tab
            v-for="eni in instance.NetworkInterfaces"
            :key="eni.NetworkInterfaceId"
            :title="eni.NetworkInterfaceId"
          >
            <div class="row justify-content-around">
              <ul class="col-5">
                <li>VPC: {{ eni.VpcId }}</li>
                <li>SubnetID: {{ eni.SubnetId }}</li>
                <li>Status: {{ eni.Status }}</li>
                <li>Mac Address: {{ eni.MacAddress }}</li>
                <li>Description: {{ eni.Description }}</li>
              </ul>

              <div class="col-5">
                <h6>Associated security groups</h6>
                <ul>
                  <li v-for="s in eni.Groups" :key="s.GroupId">
                    <router-link
                      :to="`/network/securityGroups?securityGroupId=${s.GroupId}`"
                      >{{ s.GroupId }} {{ s.GroupName }}</router-link
                    >
                  </li>
                </ul>
              </div>
            </div>
          </gl-tab>
        </gl-tabs>
      </gl-tab>
      <gl-tab title="Security">
        <h6>Associated security groups</h6>
        <ul>
          <li v-for="s in instance.SecurityGroups" :key="s.GroupId">
            <router-link
              :to="`/network/securityGroups?securityGroupId=${s.GroupId}`"
              >{{ s.GroupId }} {{ s.GroupName }}</router-link
            >
          </li>
        </ul>
      </gl-tab>
      <gl-tab title="Storage">
        <div class="row justify-content-around mt-3">
          <gl-card class="col-3" title="Root device type">{{
            instance.RootDeviceType
          }}</gl-card>
          <gl-card class="col-3" title="Root device name">{{
            instance.RootDeviceName
          }}</gl-card>
          <gl-card class="col-3" title="EBS optimized?">{{
            instance.EbsOptimized
          }}</gl-card>
          <gl-card class="col-3" title="Virtualization type">{{
            instance.VirtualizationType
          }}</gl-card>
        </div>

        <h5 class="mt-2">Attached devices</h5>

        <gl-table :items="instance.BlockDeviceMappings" :fields="storageFields">
          <template v-slot:cell(AttachTime)="data">
            {{ data.item.Ebs.AttachTime }}
          </template>

          <template v-slot:cell(Delete)="data">
            {{ data.item.Ebs.DeleteOnTermination }}
          </template>

          <template v-slot:cell(Status)="data">
            {{ data.item.Ebs.Status }}
          </template>

          <template v-slot:cell(ID)="data">
            {{ data.item.Ebs.VolumeId }}
          </template>
        </gl-table>
      </gl-tab>
    </gl-tabs>
  </div>
</template>

<script lang="ts">
import { GlBadge, GlTab, GlTable, GlTabs, GlCard } from "@gitlab/ui";
import { Component, Prop, Vue } from "vue-property-decorator";
import { instances } from "@/components/EC2/instances/instance";
import InstanceWithRegion = instances.InstanceWithRegion;
import RegionText from "@/components/common/RegionText.vue";

@Component({
  components: {
    GlBadge,
    GlTabs,
    GlTab,
    GlTable,
    GlCard,
    RegionText,
  },
})
export default class Instance extends Vue {
  @Prop(Object) readonly instance!: InstanceWithRegion;

  storageFields = [
    {
      key: "DeviceName",
    },
    {
      key: "AttachTime",
      label: "Attach Time",
    },
    {
      key: "Delete",
      label: "Delete on termination?",
    },
    {
      key: "Status",
      label: "Status",
    },
    {
      key: "ID",
      label: "Volume ID",
    },
  ];

  get badgeVariant() {
    switch (this.instance.State?.Name) {
      case "pending":
        return "warning";
      case "running":
        return "success";
      case "shutting-down":
        return "warning";
      case "terminated":
        return "dark";
      case "stopping":
        return "warning";
      case "stopped":
        return "danger";
      default:
        return "secondary";
    }
  }
}
</script>

<style scoped></style>
