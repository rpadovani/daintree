import { Component } from "vue-property-decorator";
import { DaintreeListComponent } from "@/mixins/DaintreeListComponent";
import SNSClient from "aws-sdk/clients/sns";

@Component
export class SnsListComponent<
  R extends { [key: string]: any },
  K extends keyof R
> extends DaintreeListComponent<R, K> {
  getLastElementArn(arn: string | undefined): string {
    if (!arn) {
      return "";
    }
    const arnPieces = arn.split(":");
    return arnPieces[arnPieces.length - 1];
  }

  get selectedResourceTitle(): string {
    if (!this.selectedResource) {
      return "";
    }

    return this.getLastElementArn(
      this.selectedResource[this.resourceUniqueKey]
    );
  }

  async client(region: string): Promise<SNSClient | void> {
    const credentials = await this.credentials();

    if (credentials !== undefined) {
      return new SNSClient({ region, credentials });
    }
  }
}
