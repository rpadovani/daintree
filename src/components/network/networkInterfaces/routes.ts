const NetworkInterfaceList = () =>
  import(
    /* webpackChunkName: "network_network_interface_list" */ "./NetworkInterfaceList.vue"
  );
const NewNetworkInterface = () =>
  import(
    /* webpackChunkName: "network_network_interface_new" */ "./NewNetworkInterface.vue"
  );

export const networkInterfaceRoutes = [
  {
    path: "/network/interfaces/new",
    component: NewNetworkInterface,
    meta: { title: "New network interface ", requiresLogin: true },
  },
  {
    path: "/network/interfaces",
    component: NetworkInterfaceList,
    meta: { title: "Network interfaces", requiresLogin: true },
  },
];
