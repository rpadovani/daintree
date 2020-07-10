const EndpointList = () =>
  import(/* webpackChunkName: "network_endpoint_list" */ "./EndpointList.vue");
const NewEndpoint = () =>
  import(/* webpackChunkName: "network_endpoint_new" */ "./NewEndpoint.vue");

export const endpointRoutes = [
  {
    path: "/network/endpoints/new",
    component: NewEndpoint,
    meta: { title: "New endpoint ", requiresLogin: true },
  },
  {
    path: "/network/endpoints",
    component: EndpointList,
    meta: { title: "Endpoints", requiresLogin: true },
  },
];
