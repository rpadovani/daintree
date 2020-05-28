const VolumesList = () =>
  import(/* webpackChunkName: "ec2_volume_list" */ "./VolumesList.vue");
const NewVolume = () =>
  import(/* webpackChunkName: "ec2_volume_new" */ "./NewVolume.vue");

export const volumesRoutes = [
  {
    path: "/ec2/volumes/new",
    component: NewVolume,
    meta: { title: "New volume", requiresLogin: true },
  },
  {
    path: "/ec2/volumes",
    component: VolumesList,
    meta: { title: "Volumes", requiresLogin: true },
  },
];
