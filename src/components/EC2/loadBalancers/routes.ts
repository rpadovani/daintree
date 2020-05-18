const LoadBalancersList = () =>
  import(
    /* webpackChunkName: "ec2_loadBalancers_list" */ "./LoadBalancersList.vue"
  );

export const loadBalancersRoutes = [
  // {
  //   path: "/eLBv2/loadBalancers/new",
  //   component: NewLoadBalancer,
  //   meta: { title: "New ELBv2 LoadBalancer", requiresLogin: true }
  // },
  {
    path: "/ec2/loadBalancers",
    component: LoadBalancersList,
    meta: { title: "Load Balancers", requiresLogin: true },
  },
];
