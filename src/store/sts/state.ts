import { CognitoIdentityCredentials, Credentials } from "aws-sdk/lib/core";

const sessionData = JSON.parse(sessionStorage.getItem("loginData") || "{}");

let credentials: Credentials | undefined = undefined;

const accessKeyId = sessionStorage.getItem("accessKeyId");
const secretAccessKey = sessionStorage.getItem("secretAccessKey");
const IdentityId = sessionStorage.getItem("cognito#IdentityId");
const region = sessionStorage.getItem("cognito#Region") || undefined;

if (accessKeyId !== null && secretAccessKey !== null) {
  if (sessionData.loginMethod === "cognito" && IdentityId) {
    //TODO: We should keep the refresh token from the pool and use it again
    const Logins = JSON.parse(sessionStorage.getItem("cognito#Logins") || "{}");

    credentials = new CognitoIdentityCredentials(
      { Logins, IdentityId },
      { region }
    );
  } else {
    credentials = new Credentials({
      accessKeyId,
      secretAccessKey,
    });
  }
}

export class STSState {
  userArn: string | null = sessionData.userArn || null;
  accountID: string | null = sessionData.accountID || null;
  regionsEnabled: string[] = JSON.parse(
    localStorage.getItem("regionsEnabled") || "[]"
  );

  //The original credentials used to login
  credentials: Credentials | undefined = credentials;
  //Current credentials when a role is assumed
  currentCredentials: Credentials | undefined = undefined;

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
  credentials?: Credentials | undefined;
}
