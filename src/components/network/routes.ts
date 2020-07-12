import { natRoutes } from "@/components/network/NAT/routes";
import { vpcRoutes } from "@/components/network/VPC/routes";
import { igwRoutes } from "@/components/network/igw/routes";
import { subnetRoutes } from "@/components/network/subnets/routes";
import { eipRoutes } from "@/components/network/eips/routes";
import { routeTableRoutes } from "@/components/network/routeTables/routes";
import { securityGroupRoutes } from "@/components/network/securityGroups/routes";
import { peeringRoutes } from "@/components/network/peering/routes";
import { endpointRoutes } from "@/components/network/endpoints/routes";
import { networkInterfaceRoutes } from "@/components/network/networkInterfaces/routes";

const NetworkMain = () =>
  import(/* webpackChunkName: "network_main" */ "./NetworkMain.vue");

const mainRoute = {
  path: "/network",
  component: NetworkMain,
  meta: {
    title: "Network",
    requiresLogin: true,
    hideRefresher: true,
  },
};
export const NetworkRoutes = [
  mainRoute,
  ...vpcRoutes,
  ...natRoutes,
  ...igwRoutes,
  ...subnetRoutes,
  ...eipRoutes,
  ...routeTableRoutes,
  ...securityGroupRoutes,
  ...peeringRoutes,
  ...endpointRoutes,
  ...networkInterfaceRoutes,
];
