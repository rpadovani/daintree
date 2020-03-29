export interface QueueWithRegion {
  queueUrl?: string;
  stillPresent?: boolean;
  region?: string;

  ApproximateNumberOfMessages?: string;
  ApproximateNumberOfMessagesDelayed?: string;
  ApproximateNumberOfMessagesNotVisible?: string;
  ContentBasedDeduplication?: string;
  CreatedTimestamp?: string;
  DelaySeconds?: string;
  FifoQueue?: string;
  LastModifiedTimestamp?: string;
  MaximumMessageSize?: string;
  MessageRetentionPeriod?: string;
  QueueArn?: string;
  ReceiveMessageWaitTimeSeconds?: string;
  VisibilityTimeout?: string;
}
