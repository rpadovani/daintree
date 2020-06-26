import { Component } from "vue-property-decorator";

import { DaintreeListComponent } from "@/mixins/DaintreeListComponent";
import SQSClient from "aws-sdk/clients/sqs";

@Component
export class SqsComponent<
  R extends { [key: string]: any },
  K extends keyof R
> extends DaintreeListComponent<R, K> {
  getQueueNameFromUrl(queueUrl: string): string {
    const queuePieces = queueUrl.split("/");
    return queuePieces[queuePieces.length - 1];
  }

  get selectedResourceTitle(): string {
    if (this.selectedResource?.queueUrl) {
      return this.getQueueNameFromUrl(this.selectedResource.queueUrl);
    }
    return "";
  }

  async client(region: string): Promise<SQSClient | void> {
    const credentials = await this.credentials();

    if (credentials !== undefined) {
      return new SQSClient({ region, credentials });
    }
  }
}
