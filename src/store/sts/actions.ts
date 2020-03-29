import { ActionContext } from "vuex";
import { Role, STSState } from "@/store/sts/state";
import AWS from "aws-sdk";
import { AppNotification } from "@/store/notifications/state";

export const STSActions = {
  loginWithAccessKey(
    context: ActionContext<STSState, any>,
    payload: { ["accessKeyId"]: string; ["secretAccessKey"]: string }
  ) {
    return new Promise((resolve, reject) => {
      AWS.config = new AWS.Config();
      AWS.config.accessKeyId = payload.accessKeyId;
      AWS.config.secretAccessKey = payload.secretAccessKey;

      const STS = new AWS.STS();

      STS.getCallerIdentity({}, (err, data) => {
        context.commit("notifications/dismissByKey", "login", { root: true });

        if (err) {
          const notification: AppNotification = {
            key: "login",
            text: err.message,
            variant: "danger"
          };
          context.commit("notifications/show", notification, { root: true });
          return reject();
        } else {
          context.commit("login", {
            arn: data.Arn,
            account: data.Account,
            accessKeyId: payload.accessKeyId,
            secretAccessKey: payload.secretAccessKey
          });

          return resolve();
        }
      });
    });
  },

  loginWithCognito(
    context: ActionContext<STSState, any>,
    payload: {
      ["issuer"]: string;
      ["idToken"]: string;
      ["cognitoIdentityPoolId"]: string;
    }
  ) {
    context.commit("notifications/dismissByKey", "cognitoCallback", {
      root: true
    });

    return new Promise((resolve, reject) => {
      //Cognito returns `https://` in the issuer field, but it is not required by the identity pool
      //Not sure about other issuers
      const iss = payload.issuer.replace("https://", "");

      const Logins: { [key: string]: string } = {};
      Logins[iss] = payload.idToken;

      //The cognito identity pool contains the region in the name
      AWS.config.region = payload.cognitoIdentityPoolId.split(":")[0];

      const credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: payload.cognitoIdentityPoolId,
        Logins
      });

      AWS.config.credentials = credentials;
      credentials.refresh(err => {
        if (err) {
          const notification: AppNotification = {
            key: "cognitoCallback",
            text: err.message,
            variant: "danger"
          };
          context.commit("notifications/show", notification, { root: true });
          return reject();
        } else {
          const STS = new AWS.STS();

          STS.getCallerIdentity({}, (err, data) => {
            if (err) {
              const notification: AppNotification = {
                key: "cognitoCallback",
                text: err.message,
                variant: "danger"
              };
              context.commit("notifications/show", notification, {
                root: true
              });
              return reject();
            } else {
              context.commit("loginWithCognito", {
                credentials,
                userArn: data.Arn,
                accountId: data.Account
              });
              return resolve();
            }
          });
        }
      });
    });
  },

  assumeRole(
    context: ActionContext<STSState, any>,
    payload: {
      ["accountId"]: string;
      ["role"]: string;
      ["nickname"]: string;
      ["newRole"]?: boolean;
    }
  ) {
    return new Promise((resolve, reject) => {
      //If we aren't in the main account at the moment, we first switch to it
      if (context.state.currentRole !== -1) {
        //We do not commit in the state we have switched role to avoid unnecessary reloading of resources
        context.commit("backToMain", true);
      }

      const STS = new AWS.STS();
      STS.assumeRole(
        {
          RoleArn: `arn:aws:iam::${payload.accountId}:role/${payload.role}`,
          RoleSessionName: "daintree"
        },
        (err, data) => {
          if (err) {
            const notification: AppNotification = {
              key: "assumeRole",
              text: err.message,
              variant: "danger"
            };
            context.commit("notifications/show", notification, { root: true });
            return reject();
          } else {
            AWS.config.update({
              accessKeyId: data.Credentials?.AccessKeyId,
              secretAccessKey: data.Credentials?.SecretAccessKey,
              sessionToken: data.Credentials?.SessionToken
            });
            if (payload.newRole) {
              const role: Role = {
                accountId: payload.accountId,
                nickname: payload.nickname,
                role: payload.role
              };
              context.commit("addRole", role);
            } else {
              context.commit(
                "switchRole",
                context.state.roles.findIndex(
                  r =>
                    r.accountId === payload.accountId && r.role === payload.role
                )
              );
            }
            return resolve();
          }
        }
      );
    });
  }
};
