import { ActionContext } from "vuex";
import { Role, STSState } from "@/store/sts/state";
import STSClient from "aws-sdk/clients/sts";
import { AppNotification } from "@/store/notifications/state";
import CognitoIdentityClient from "aws-sdk/clients/cognitoidentity";

export const STSActions = {
  loginWithAccessKey(
    context: ActionContext<STSState, any>,
    payload: { ["accessKeyId"]: string; ["secretAccessKey"]: string }
  ) {
    return new Promise((resolve, reject) => {
      const credentials = {
        accessKeyId: payload.accessKeyId,
        secretAccessKey: payload.secretAccessKey,
      };

      const STS = new STSClient({ credentials });

      STS.getCallerIdentity({}, (err, data) => {
        context.commit("notifications/dismissByKey", "login", { root: true });

        if (err) {
          const notification: AppNotification = {
            key: "login",
            text: err.message,
            variant: "danger",
          };
          context.commit("notifications/show", notification, { root: true });
          return reject();
        } else {
          context.commit("login", {
            arn: data.Arn,
            account: data.Account,
            credentials,
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
      root: true,
    });

    return new Promise((resolve, reject) => {
      //Cognito returns `https://` in the issuer field, but it is not required by the identity pool
      //Not sure about other issuers
      const iss = payload.issuer.replace("https://", "");

      const Logins: { [key: string]: string } = {};
      Logins[iss] = payload.idToken;

      //The cognito identity pool contains the region in the name
      const region = payload.cognitoIdentityPoolId.split(":")[0];

      const cognitoIdentityClient = new CognitoIdentityClient({ region });

      //We first retrieve the ID of the user
      cognitoIdentityClient.getId(
        { IdentityPoolId: payload.cognitoIdentityPoolId, Logins },
        (err, data) => {
          if (!data.IdentityId) {
            return reject("Identity not found");
          }

          const credentials = {
            IdentityId: data.IdentityId,
            Logins,
          };

          cognitoIdentityClient.getCredentialsForIdentity(
            credentials,
            (err, data) => {
              if (err) {
                const notification: AppNotification = {
                  key: "cognitoCallback",
                  text: err.message,
                  variant: "danger",
                };
                context.commit("notifications/show", notification, {
                  root: true,
                });
                return reject();
              }
              const credentials = {
                accessKeyId: data.Credentials?.AccessKeyId || "",
                secretAccessKey: data.Credentials?.SecretKey || "",
                sessionToken: data.Credentials?.SessionToken,
                expiration: data.Credentials?.Expiration,
              };
              const STS = new STSClient({ credentials, region });

              STS.getCallerIdentity({}, (err, data) => {
                if (err) {
                  const notification: AppNotification = {
                    key: "cognitoCallback",
                    text: err.message,
                    variant: "danger",
                  };
                  context.commit("notifications/show", notification, {
                    root: true,
                  });
                  return reject();
                } else {
                  context.commit("loginWithCognito", {
                    credentials,
                    userArn: data.Arn,
                    accountId: data.Account,
                  });
                  return resolve();
                }
              });
            }
          );
        }
      );
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
      if (!context.state.credentials) {
        return reject("Not logged in");
      }

      //We go back to the main account to switch role
      const credentials = context.state.credentials;

      const STS = new STSClient({ credentials });
      STS.assumeRole(
        {
          RoleArn: `arn:aws:iam::${payload.accountId}:role/${payload.role}`,
          RoleSessionName: "daintree",
        },
        (err, data) => {
          if (err) {
            const notification: AppNotification = {
              key: "assumeRole",
              text: err.message,
              variant: "danger",
            };
            context.commit("notifications/show", notification, { root: true });
            return reject();
          } else if (data.Credentials) {
            const credentials = {
              accessKeyId: data.Credentials?.AccessKeyId || "",
              secretAccessKey: data.Credentials?.SecretAccessKey || "",
              sessionToken: data.Credentials?.SessionToken,
              expiration: data.Credentials?.Expiration,
            };

            if (payload.newRole) {
              const role: Role = {
                accountId: payload.accountId,
                nickname: payload.nickname,
                role: payload.role,
                credentials,
              };
              context.commit("addRole", role);
            } else {
              context.commit("switchRole", {
                roleIndex: context.state.roles.findIndex(
                  (r) =>
                    r.accountId === payload.accountId && r.role === payload.role
                ),
                credentials,
              });
            }
            return resolve();
          }
        }
      );
    });
  },
};
