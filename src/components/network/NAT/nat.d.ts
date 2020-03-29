import { NatGateway } from "aws-sdk/clients/ec2";

declare namespace nats {
  interface NatWithRegion extends NatGateway {
    region?: string;
    //Keep track if a nat is still present when we download updated data - has it been deleted from another
    //resource?
    stillPresent?: boolean;
  }
}
