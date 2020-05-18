import { LoadBalancer } from "aws-sdk/clients/elbv2";

declare namespace loadBalancers {
  interface LoadBalancerWithRegion extends LoadBalancer {
    region?: string;
    //Keep track if a nat is still present when we download updated data - has it been deleted from another
    //resource?
    stillPresent?: boolean;
  }
}
