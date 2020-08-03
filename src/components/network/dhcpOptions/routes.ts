const DhcpOptionsList = () =>
  import(
    /* webpackChunkName: "network_network_interface_list" */ "./DhcpOptionsList.vue"
  );
const NewDhcpOptions = () =>
  import(
    /* webpackChunkName: "network_network_interface_new" */ "./NewDhcpOptions.vue"
  );

export const dhcpOptionsRoutes = [
  {
    path: "/network/dhcp/new",
    component: NewDhcpOptions,
    meta: { title: "New DHCP options set", requiresLogin: true },
  },
  {
    path: "/network/dhcp",
    component: DhcpOptionsList,
    meta: { title: "DHCP options sets", requiresLogin: true },
  },
];
