import { sqsRoutes } from "@/components/messages/SQS/routes";
import { snsRoutes } from "@/components/messages/SNS/routes";

const MessagesMain = () =>
  import(/* webpackChunkName: "messages_main" */ "./MessagesMain.vue");

const mainRoute = {
  path: "/messages",
  component: MessagesMain,
  meta: {
    title: "Messages",
    requiresLogin: true,
  },
};
export const MessagesRoutes = [mainRoute, ...sqsRoutes, ...snsRoutes];
