const SNSTopicsList = () =>
  import(
    /* webpackChunkName: "messages_sns_topics_list" */ "./SNSTopicsList.vue"
  );
const NewSNS = () =>
  import(/* webpackChunkName: "messages_sns_new" */ "./NewSNS.vue");

const SNSSubscriptionsList = () =>
  import(
    /* webpackChunkName: "messages_sns_subscriptions_list" */ "./SNSSubscriptionsList.vue"
  );

export const snsRoutes = [
  {
    path: "/messages/sns/new",
    component: NewSNS,
    meta: { title: "New topic", requiresLogin: true },
  },
  {
    path: "/messages/sns_topics",
    component: SNSTopicsList,
    meta: { title: "SNS topics", requiresLogin: true },
  },
  {
    path: "/messages/sns_subscriptions",
    component: SNSSubscriptionsList,
    meta: { title: "SNS subscriptions", requiresLogin: true },
  },
];
