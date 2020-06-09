import { VpcPeeringConnection } from "aws-sdk/clients/ec2";

declare namespace peerings {
  interface PeeringWithRegion extends VpcPeeringConnection {
    stillPresent?: boolean;
    region?: string;
  }
}
