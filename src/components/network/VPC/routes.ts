const VPCList = () =>
  import(/* webpackChunkName: "network_vpc_list" */ "./VPCList.vue");
const NewVPC = () =>
  import(/* webpackChunkName: "network_vpc_new" */ "./NewVPC.vue");

export const vpcRoutes = [
  {
    path: "/network/vpcs/new",
    component: NewVPC,
    meta: { title: "New VPC", requiresLogin: true, hideRefresher: true },
  },
  {
    path: "/network/vpcs",
    component: VPCList,
    meta: { title: "VPCs", requiresLogin: true },
  },
];
