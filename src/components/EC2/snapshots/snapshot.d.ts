import { Snapshot } from "aws-sdk/clients/ec2";

declare namespace snapshots {
  interface SnapshotWithRegion extends Snapshot {
    stillPresent?: boolean;
    region?: string;
  }
}
