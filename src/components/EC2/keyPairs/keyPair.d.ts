import { KeyPair } from "aws-sdk/clients/ec2";

declare namespace keyPairs {
  interface KeyPairWithRegion extends KeyPair {
    stillPresent?: boolean;
    region?: string;
  }
}
