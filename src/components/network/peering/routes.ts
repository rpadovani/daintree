const PeeringList = () =>
  import(/* webpackChunkName: "network_peering_list" */ "./PeeringList.vue");
const NewPeering = () =>
  import(/* webpackChunkName: "network_peering_new" */ "./NewPeering.vue");

export const peeringRoutes = [
  {
    path: "/network/peeringConnections/new",
    component: NewPeering,
    meta: { title: "New peering connection", requiresLogin: true },
  },
  {
    path: "/network/peeringConnections",
    component: PeeringList,
    meta: { title: "Peering connections", requiresLogin: true },
  },
];
