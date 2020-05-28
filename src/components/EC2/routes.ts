import { instancesRoutes } from "@/components/EC2/instances/routes";
import { loadBalancersRoutes } from "@/components/EC2/loadBalancers/routes";
import { targetGroupsRoutes } from "@/components/EC2/targetGroups/routes";
import { keyPairsRoutes } from "@/components/EC2/keyPairs/routes";
import { volumesRoutes } from "@/components/EC2/volumes/routes";
import { snapshotsRoutes } from "@/components/EC2/snapshots/routes";

const EC2Main = () =>
  import(/* webpackChunkName: "ec2_main" */ "./EC2Main.vue");

const mainRoute = {
  path: "/ec2",
  component: EC2Main,
  meta: {
    title: "EC2",
    requiresLogin: true,
  },
};
export const EC2Routes = [
  mainRoute,
  ...instancesRoutes,
  ...loadBalancersRoutes,
  ...targetGroupsRoutes,
  ...keyPairsRoutes,
  ...volumesRoutes,
  ...snapshotsRoutes,
];
