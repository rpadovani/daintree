import { Subnet } from "aws-sdk/clients/ec2";

declare namespace Subnets {
  interface SubnetWithRegion extends Subnet {
    stillPresent?: boolean;
    region?: string;
  }
}
