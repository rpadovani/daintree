import { SecurityGroup } from "aws-sdk/clients/ec2";

declare namespace securityGroups {
  interface SecurityGroupWithRegion extends SecurityGroup {
    stillPresent?: boolean;
    region?: string;
  }

  interface FlattenRule {
    //Ports whitelisted
    fromPort: number | undefined;
    toPort: number | undefined;

    //One of this is the source (ingress) or target (egress)
    groupId?: string | undefined;
    groupName?: string | undefined;
    cidr?: string | undefined; //Could be both IPv4 or IPv6, we are not really interested in the difference

    sourceDescription?: string | undefined;

    prefixListId?: string | undefined; //?
    protocol?: string | undefined;

    editing: boolean; // Keep track of which rules are we editing
  }
}
