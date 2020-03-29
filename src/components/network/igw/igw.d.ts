import { InternetGateway } from "aws-sdk/clients/ec2";

declare namespace igws {
  interface IgwWithRegion extends InternetGateway {
    region?: string;
    stillPresent?: boolean;
  }
}
