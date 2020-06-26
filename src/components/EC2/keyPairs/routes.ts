const KeyPairsList = () =>
  import(/* webpackChunkName: "ec2_key_pair_list" */ "./KeyPairsList.vue");
const NewKeyPair = () =>
  import(/* webpackChunkName: "ec2_key_pair_new" */ "./NewKeyPair.vue");

export const keyPairsRoutes = [
  {
    path: "/ec2/keyPairs/new",
    component: NewKeyPair,
    meta: { title: "New key pair", requiresLogin: true, hideRefresher: true },
  },
  {
    path: "/ec2/keyPairs",
    component: KeyPairsList,
    meta: { title: "Key pairs", requiresLogin: true },
  },
];
