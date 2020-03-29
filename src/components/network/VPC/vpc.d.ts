import { Vpc } from "aws-sdk/clients/ec2";

declare namespace vpcs {
  interface VpcWithRegion extends Vpc {
    stillPresent?: boolean;
    region?: string;
  }
}
