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
  async assumeRole(
    context: ActionContext<STSState, any>,
    payload: {
      ["accountId"]: string;
      ["role"]: string;
      ["nickname"]: string;
      ["newRole"]?: boolean;
      ["remember"]?: boolean;
    }
  ): Promise<void> {
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
