import { taskDefinitionsRoutes } from "@/components/ECS/taskDefinitions/routes";

const ECSMain = () =>
  import(/* webpackChunkName: "ecs_main" */ "./ECSMain.vue");

const mainRoute = {
  path: "/ecs",
  component: ECSMain,
  meta: {
    title: "ECS",
    requiresLogin: true,
  },
};
export const ECSRoutes = [mainRoute, ...taskDefinitionsRoutes];
