<template>
  <div>
    <Header v-if="!onlyContent" :hide-refresher="true" />
    <div class="container mt-2">
      <h3>Network resources</h3>
      <div class="row mt-2">
        <div
          class="col-12 col-sm-6 col-lg-3 mt-1"
          v-for="entry in entries"
          :key="entry.label"
        >
          <gl-avatar-link :to="entry.target">
            <gl-avatar-labeled
              :label="entry.label"
              :sub-label="entry.subLabel"
              :src="entry.iconUrl"
              shape="rect"
              :size="32"
            >
            </gl-avatar-labeled>
          </gl-avatar-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { GlAvatarLabeled, GlAvatarLink } from "@gitlab/ui";
import { Component, Prop, Vue } from "vue-property-decorator";
import Header from "@/components/Header/Header.vue";
import { MenuEntry } from "@/components/common/menuEntry";

@Component({
  components: {
    Header,
    GlAvatarLabeled,
    GlAvatarLink,
  },
})
export default class NetworkMain extends Vue {
  @Prop(Boolean) readonly onlyContent: boolean | undefined;

  readonly entries: MenuEntry[] = [
    {
      target: "/network/vpcs",
      label: "VPCs",
      subLabel: "Isolated Cloud Resources",
      iconUrl: "/assets/aws-icons/network/Amazon-VPC.svg",
    },
    {
      target: "/network/subnets",
      label: "Subnets",
      subLabel: "Logical subdivision IP network",
      iconUrl: "/assets/aws-icons/network/VPC-subnet-private_light-bg.svg",
    },
    {
      target: "network/igws",
      label: "Internet Gateways",
      subLabel: "Connect to the Internet",
      iconUrl:
        "/assets/aws-icons/network/Amazon-VPC_Internet-Gateway_light-bg.svg",
    },
    {
      target: "network/nats",
      label: "Nat Gateways",
      subLabel: "Network Address Translation",
      iconUrl: "/assets/aws-icons/network/Amazon-VPC_NAT-Gateway_light-bg.svg",
    },
    {
      target: "network/routeTables",
      label: "Route Tables",
      subLabel: "Route your traffic",
      iconUrl:
        "/assets/aws-icons/network/Amazon-Route-53_Route-Table_light-bg.svg",
    },
    {
      target: "network/eips",
      label: "Elastic IPs",
      subLabel: "Static IPv4 addresses",
      iconUrl:
        "/assets/aws-icons/network/Amazon-EC2_Elastic-IP-Address_light-bg.svg",
    },
    {
      target: "network/securityGroups",
      label: "Security groups",
      subLabel: "Virtual firewalls",
    },
    {
      target: "network/peeringConnections",
      label: "Peering connections",
      subLabel: "Connect VPCs",
      iconUrl: "/assets/aws-icons/network/Amazon-VPC_Peering_light-bg.svg",
    },
  ];
}
</script>

<style scoped></style>
