import { RouteTable } from "aws-sdk/clients/ec2";

declare namespace routeTables {
  interface RouteTableWithRegion extends RouteTable {
    stillPresent?: boolean;
    region?: string;
  }
}
