const NatList = () =>
  import(/* webpackChunkName: "network_nat_list" */ "./NatList.vue");
const NewNat = () =>
  import(/* webpackChunkName: "network_nat_new" */ "./NewNat.vue");

export const natRoutes = [
  {
    path: "/network/nats/new",
    component: NewNat,
    meta: { title: "New Nat", requiresLogin: true }
  },
  {
    path: "/network/nats",
    component: NatList,
    meta: { title: "Nat Gateways", requiresLogin: true }
  }
];
