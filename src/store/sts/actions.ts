import { ActionContext } from "vuex";
import { Role, STSState } from "@/store/sts/state";
import STSClient from "aws-sdk/clients/sts";
import { CognitoIdentityCredentials, Credentials } from "aws-sdk/lib/core";
import CognitoIdentityClient from "aws-sdk/clients/cognitoidentity";

async function getCallerIdentity(
  loginMethod: "cognito" | "accessKey",
  context: ActionContext<STSState, any>,
  credentials: Credentials
): Promise<void> {
  const STS = new STSClient({ credentials });

  const response = await STS.getCallerIdentity({}).promise();
  context.commit("login", {
    arn: response.Arn,
    account: response.Account,
    credentials,
    loginMethod,
  });
}

export const STSActions = {
  loginWithAccessKey(
    context: ActionContext<STSState, any>,
    payload: { ["accessKeyId"]: string; ["secretAccessKey"]: string }
  ) {
    const credentials = new Credentials({
      accessKeyId: payload.accessKeyId,
      secretAccessKey: payload.secretAccessKey,
    });

    return getCallerIdentity("accessKey", context, credentials);
  },

  async loginWithCognito(
    context: ActionContext<STSState, any>,
    payload: {
      ["issuer"]: string;
      ["idToken"]: string;
      ["cognitoIdentityPoolId"]: string;
    }
  ) {
    context.commit("notifications/dismissByKey", "cognitoCallback", {
      root: true,
    });

    //Cognito returns `https://` in the issuer field, but it is not required by the identity pool
    //Not sure about other issuers
    const iss = payload.issuer.replace("https://", "");

    const Logins: { [key: string]: string } = {};
    Logins[iss] = payload.idToken;

    //The cognito identity pool contains the region in the name
    const region = payload.cognitoIdentityPoolId.split(":")[0];

    const cognitoIdentityClient = new CognitoIdentityClient({ region });

    //We first retrieve the ID of the user
    const getIdResponse = await cognitoIdentityClient
      .getId({ IdentityPoolId: payload.cognitoIdentityPoolId, Logins })
      .promise();

    if (!getIdResponse.IdentityId) {
      throw new Error("Identity not found");
    }

    const cognitoCredentials = new CognitoIdentityCredentials(
      {
        IdentityId: getIdResponse.IdentityId,
        Logins,
      },
      { region }
    );

    await cognitoCredentials.getPromise();

    sessionStorage.setItem("cognito#IdentityId", getIdResponse.IdentityId);
    sessionStorage.setItem("cognito#Logins", JSON.stringify(Logins));
    sessionStorage.setItem("cognito#Region", region);

    return getCallerIdentity("cognito", context, cognitoCredentials);
  },

  async assumeRole(
    context: ActionContext<STSState, any>,
    payload: {
      ["accountId"]: string;
      ["role"]: string;
      ["nickname"]: string;
      ["newRole"]?: boolean;
      ["remember"]?: boolean;
    }
  ) {
    if (!context.state.credentials) {
      throw new Error("Not logged in");
    }

    //We go back to the main account to switch role
    const credentials = context.state.credentials;

    const STS = new STSClient({ credentials });
    const data = await STS.assumeRole({
      RoleArn: `arn:aws:iam::${payload.accountId}:role/${payload.role}`,
      RoleSessionName: "daintree",
    }).promise();

    if (!data.Credentials) {
      throw new Error("noCredentials");
    }

    const newCredentials = new Credentials({
      accessKeyId: data.Credentials?.AccessKeyId || "",
      secretAccessKey: data.Credentials?.SecretAccessKey || "",
      sessionToken: data.Credentials?.SessionToken,
    });

    if (payload.newRole) {
      const role: Role = {
        accountId: payload.accountId,
        nickname: payload.nickname,
        role: payload.role,
        credentials: newCredentials,
        remember: payload.remember,
      };
      context.commit("addRole", role);
    } else {
      context.commit("switchRole", {
        roleIndex: context.state.roles.findIndex(
          (r) => r.accountId === payload.accountId && r.role === payload.role
        ),
        credentials: newCredentials,
      });
    }
  },
};
