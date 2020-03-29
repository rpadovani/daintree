const SQSList = () =>
  import(/* webpackChunkName: "messages_sqs_list" */ "./SQSList.vue");
const NewSQS = () =>
  import(/* webpackChunkName: "messages_sqs_new" */ "./NewSQS.vue");

export const sqsRoutes = [
  {
    path: "/messages/sqs/new",
    component: NewSQS,
    meta: { title: "New queue", requiresLogin: true }
  },
  {
    path: "/messages/sqs",
    component: SQSList,
    meta: { title: "SQS", requiresLogin: true }
  }
];
