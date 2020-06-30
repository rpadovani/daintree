import { taskDefinitionsRoutes } from "@/components/ECS/taskDefinitions/routes";
import { clusterRoutes } from "@/components/ECS/clusters/routes";

const ECSMain = () =>
  import(/* webpackChunkName: "ecs_main" */ "./ECSMain.vue");

const mainRoute = {
  path: "/ecs",
  component: ECSMain,
  meta: {
    title: "ECS",
    requiresLogin: true,
    hideRefresher: true,
  },
};
export const ECSRoutes = [
  mainRoute,
  ...taskDefinitionsRoutes,
  ...clusterRoutes,
];
