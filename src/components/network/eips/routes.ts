const EipList = () =>
  import(/* webpackChunkName: "network_eip_list" */ "./EipList.vue");
const NewEip = () =>
  import(/* webpackChunkName: "network_eip_new" */ "./NewEip.vue");

export const eipRoutes = [
  {
    path: "/network/eips/new",
    component: NewEip,
    meta: { title: "New Elastic Ip", requiresLogin: true },
  },
  {
    path: "/network/eips",
    component: EipList,
    meta: { title: "Elastic IPs", requiresLogin: true },
  },
];
