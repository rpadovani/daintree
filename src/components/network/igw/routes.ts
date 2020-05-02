const IgwList = () =>
  import(/* webpackChunkName: "network_igw_list" */ "./IgwList.vue");
const NewIgw = () =>
  import(/* webpackChunkName: "network_igw_new" */ "./NewIgw.vue");

export const igwRoutes = [
  {
    path: "/network/igws/new",
    component: NewIgw,
    meta: { title: "New Internet Gateway", requiresLogin: true },
  },
  {
    path: "/network/igws",
    component: IgwList,
    meta: { title: "Internet Gateways", requiresLogin: true },
  },
];
