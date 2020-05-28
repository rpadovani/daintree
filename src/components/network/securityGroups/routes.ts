const SecurityGroupList = () =>
  import(
    /* webpackChunkName: "network_security_group_list" */ "./SecurityGroupList.vue"
  );
const NewSecurityGroup = () =>
  import(
    /* webpackChunkName: "network_security_group_new" */ "./NewSecurityGroup.vue"
  );

export const securityGroupRoutes = [
  {
    path: "/network/securityGroups/new",
    component: NewSecurityGroup,
    meta: { title: "New security group", requiresLogin: true },
  },
  {
    path: "/network/securityGroups",
    component: SecurityGroupList,
    meta: { title: "Security groups", requiresLogin: true },
  },
];
