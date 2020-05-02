const SubnetList = () =>
  import(/* webpackChunkName: "network_subnet_list" */ "./SubnetList.vue");
const NewSubnet = () =>
  import(/* webpackChunkName: "network_subnet_new" */ "./NewSubnet.vue");

export const subnetRoutes = [
  {
    path: "/network/subnets/new",
    component: NewSubnet,
    meta: { title: "New subnet", requiresLogin: true },
  },
  {
    path: "/network/subnets",
    component: SubnetList,
    meta: { title: "Subnets", requiresLogin: true },
  },
];
