import { TargetGroup } from "aws-sdk/clients/elbv2";

declare namespace targetGroups {
  interface TargetGroupWithRegion extends TargetGroup {
    region?: string;
    //Keep track if a nat is still present when we download updated data - has it been deleted from another
    //resource?
    stillPresent?: boolean;
  }
}
