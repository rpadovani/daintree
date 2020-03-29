export interface TopicWithRegion {
  topicArn?: string;
  stillPresent?: boolean;
  region?: string;

  DisplayName?: string;
  Owner?: string;
  Policy?: string;
  SubscriptionsConfirmed?: string;
  SubscriptionsDeleted?: string;
  SubscriptionsPending?: string;
  EffectiveDeliveryPolicy?: string;
}

export interface SubscriptionWithRegion {
  subscriptionArn?: string;
  stillPresent?: boolean;
  region?: string;

  ConfirmationWasAuthenticated?: string;
  DeliveryPolicy?: string;
  EffectiveDeliveryPolicy?: string;
  FilterPolicy?: string;
  Endpoint?: string;
  Owner?: string;
  PendingConfirmation?: string;
  Protocol?: string;
  RawMessageDelivery?: string;
  RedrivePolicy?: string;
  TopicArn?: string;
}
