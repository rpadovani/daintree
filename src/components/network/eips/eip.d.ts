import { Address } from "aws-sdk/clients/ec2";

declare namespace eips {
  interface EipWithRegion extends Address {
    region?: string;
    //Keep track if a eip is still present when we download updated data - has it been deleted from another
    //resource?
    stillPresent?: boolean;
  }
}
