import { Credentials } from "aws-sdk/lib/credentials";

export class STSState {
  userArn: string | null = null;
  accountID: string | null = null;
  regionsEnabled: string[] = JSON.parse(
    localStorage.getItem("regionsEnabled") || "[]"
  );

  //The original credentials used to login
  credentials:
    | Credentials
    | {
        accessKeyId: string;
        secretAccessKey: string;
        sessionToken?: string;
        expiration?: Date;
      }
    | undefined = undefined;
  //Current credentials when a role is assumed
  currentCredentials:
    | Credentials
    | {
        accessKeyId: string;
        secretAccessKey: string;
        sessionToken?: string;
        expiration?: Date;
      }
    | undefined = undefined;

  loginMethod: "cognito" | "accessKey" | undefined = undefined;

  roles: Role[] = [];

  currentRole = -1;

  routeAfterLogin: string | undefined = undefined;
  showRegionsModal = false;
}

export interface Role {
  accountId: string;
  role: string;
  nickname: string | undefined;
  credentials?:
    | {
        accessKeyId: string;
        secretAccessKey: string;
        sessionToken?: string;
        expiration?: Date;
      }
    | undefined;
}
