const KeyPairsList = () =>
  import(/* webpackChunkName: "network_vpc_list" */ "./KeyPairsList.vue");
const NewKeyPair = () =>
  import(/* webpackChunkName: "network_vpc_new" */ "./NewKeyPair.vue");

export const keyPairsRoutes = [
  {
    path: "/ec2/keyPairs/new",
    component: NewKeyPair,
    meta: { title: "New key pair", requiresLogin: true },
  },
  {
    path: "/ec2/keyPairs",
    component: KeyPairsList,
    meta: { title: "Key pairs", requiresLogin: true },
  },
];
