const SnapshotsList = () =>
  import(/* webpackChunkName: "ec2_snapshot_list" */ "./SnapshotsList.vue");
const NewSnapshot = () =>
  import(/* webpackChunkName: "ec2_snapshot_new" */ "./NewSnapshot.vue");

export const snapshotsRoutes = [
  {
    path: "/ec2/snapshots/new",
    component: NewSnapshot,
    meta: { title: "New snapshot", requiresLogin: true },
  },
  {
    path: "/ec2/snapshots",
    component: SnapshotsList,
    meta: { title: "Snapshots", requiresLogin: true },
  },
];
