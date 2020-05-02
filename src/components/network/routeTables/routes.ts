const RouteTableList = () =>
  import(
    /* webpackChunkName: "network_route_table_list" */ "./RouteTableList.vue"
  );
const NewRouteTable = () =>
  import(
    /* webpackChunkName: "network_route_table_new" */ "./NewRouteTable.vue"
  );

export const routeTableRoutes = [
  {
    path: "/network/routeTables/new",
    component: NewRouteTable,
    meta: { title: "New route table", requiresLogin: true },
  },
  {
    path: "/network/routeTables",
    component: RouteTableList,
    meta: { title: "Route tables", requiresLogin: true },
  },
];
