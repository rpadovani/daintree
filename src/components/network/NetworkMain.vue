<template>
  <ResourceMainMenu :entries="entries" resource-name="Network" />
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { MenuEntry } from "@/components/common/menuEntry";
import ResourceMainMenu from "@/components/common/ResourceMainMenu.vue";

@Component({ components: { ResourceMainMenu } })
export default class NetworkMain extends Vue {
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
    {
      target: "network/endpoints",
      label: "Endpoints",
      subLabel: "Connect VPCs to AWS services",
      iconUrl: "/assets/aws-icons/network/Amazon-VPC_Endpoints_light-bg.svg",
    },
    {
      target: "network/interfaces",
      label: "Network interfaces",
      subLabel: "Virtual network card",
      iconUrl:
        "/assets/aws-icons/network/Amazon-VPC_Elastic-Network-Interface_light-bg.svg",
    },
    {
      target: "network/dhcp",
      label: "DHCP options sets",
      subLabel: "Dynamic Host Configuration",
    },
  ];
}
</script>
