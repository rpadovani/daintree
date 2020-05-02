import { instancesRoutes } from "@/components/EC2/instances/routes";

const EC2Main = () =>
  import(/* webpackChunkName: "ec2_main" */ "./EC2Main.vue");

const mainRoute = {
  path: "/ec2",
  component: EC2Main,
  meta: {
    title: "EC2",
    requiresLogin: true,
  },
};
export const EC2Routes = [mainRoute, ...instancesRoutes];
