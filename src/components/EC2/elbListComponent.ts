import { Component } from "vue-property-decorator";
import { DaintreeListComponent } from "@/mixins/DaintreeListComponent";
import ELBv2Client from "aws-sdk/clients/elbv2";

@Component
export class ElbListComponent<
  R extends { [key: string]: any },
  K extends keyof R
> extends DaintreeListComponent<R, K> {
  async client(region: string): Promise<ELBv2Client | void> {
    const credentials = await this.credentials();

    if (credentials !== undefined) {
      return new ELBv2Client({ region, credentials });
    }
  }
}
