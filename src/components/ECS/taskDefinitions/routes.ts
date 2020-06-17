const TaskDefinitionsList = () =>
  import(
    /* webpackChunkName: "ecs_tasks_definitions_list" */ "./TasksDefinitionsList.vue"
  );
// const NewPeering = () =>
//   import(/* webpackChunkName: "ecs_tasks_definitions_new" */ "./NewPeering.vue");

export const taskDefinitionsRoutes = [
  // {
  //   path: "/ecs/tasksDefinitions/new",
  //   component: NewPeering,
  //   meta: { title: "New task_definition connection", requiresLogin: true },
  // },
  {
    path: "/ecs/tasksDefinitions",
    component: TaskDefinitionsList,
    meta: { title: "Tasks definitions", requiresLogin: true },
  },
];
