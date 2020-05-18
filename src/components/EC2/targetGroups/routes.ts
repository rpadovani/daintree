const TargetGroupsList = () =>
  import(
    /* webpackChunkName: "ec2_targetGroups_list" */ "./TargetGroupsList.vue"
  );

export const targetGroupsRoutes = [
  // {
  //   path: "/eLBv2/targetGroups/new",
  //   component: NewTargetGroup,
  //   meta: { title: "New ELBv2 TargetGroup", requiresLogin: true }
  // },
  {
    path: "/ec2/targetGroups",
    component: TargetGroupsList,
    meta: { title: "Target groups", requiresLogin: true },
  },
];
