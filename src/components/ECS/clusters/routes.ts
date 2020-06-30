const ClusterList = () =>
  import(/* webpackChunkName: "ecs_cluster_list" */ "./ClusterList.vue");

export const clusterRoutes = [
  {
    path: "/ecs/clusters",
    component: ClusterList,
    meta: { title: "Clusters", requiresLogin: true },
  },
];
