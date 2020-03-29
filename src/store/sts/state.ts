import { Credentials } from "aws-sdk";

export class STSState {
  userArn: string | null = null;
  accountID: string | null = null;
  regionsEnabled: string[] = JSON.parse(
    localStorage.getItem("regionsEnabled") || "[]"
  );
  accessKeyId: string | undefined = undefined;
  secretAccessKey: string | undefined = undefined;

  //cognito
  credentials: Credentials | undefined = undefined;

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
}
