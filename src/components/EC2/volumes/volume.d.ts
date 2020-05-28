import { Volume } from "aws-sdk/clients/ec2";

declare namespace volumes {
  interface VolumeWithRegion extends Volume {
    stillPresent?: boolean;
    region?: string;
  }
}
