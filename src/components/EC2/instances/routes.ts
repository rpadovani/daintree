const InstancesList = () =>
  import(/* webpackChunkName: "ec2_instances_list" */ "./InstancesList.vue");

export const instancesRoutes = [
  // {
  //   path: "/ec2/instances/new",
  //   component: NewInstance,
  //   meta: { title: "New EC2 Instance", requiresLogin: true }
  // },
  {
    path: "/ec2/instances",
    component: InstancesList,
    meta: { title: "EC2 Instances", requiresLogin: true }
  }
];
