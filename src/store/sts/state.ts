import { Credentials } from "aws-sdk/lib/credentials";

const sessionData = JSON.parse(sessionStorage.getItem("loginData") || "{}");

export class STSState {
  userArn: string | null = sessionData.userArn || null;
  accountID: string | null = sessionData.accountID || null;
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
    | undefined = sessionData.credentials || undefined;
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

  loginMethod: "cognito" | "accessKey" | undefined =
    sessionData.loginMethod || undefined;

  roles: Role[] = JSON.parse(localStorage.getItem("roles") || "[]");

  currentRole = -1;

  routeAfterLogin: string | undefined = undefined;
  showRegionsModal = false;
}

export interface Role {
  accountId: string;
  role: string;
  nickname: string | undefined;
  remember?: boolean | undefined;
  credentials?:
    | {
        accessKeyId: string;
        secretAccessKey: string;
        sessionToken?: string;
        expiration?: Date;
      }
    | undefined;
}
