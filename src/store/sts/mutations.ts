import { MutationTree } from "vuex";
import { Role, STSState } from "@/store/sts/state";
import AWS from "aws-sdk";

export const STSMutations = {
  login(state: STSState, { arn, account, accessKeyId, secretAccessKey }) {
    state.userArn = arn;
    state.accountID = account;
    state.accessKeyId = accessKeyId;
    state.secretAccessKey = secretAccessKey;
    state.loginMethod = "accessKey";
  },
  loginWithCognito(state: STSState, { accountId, userArn, credentials }) {
    state.loginMethod = "cognito";
    state.accountID = accountId;
    state.userArn = userArn;
    state.credentials = credentials;
  },
  setEnabledRegions(state: STSState, regions) {
    state.regionsEnabled = regions;

    localStorage.setItem("regionsEnabled", JSON.stringify(regions));
  },
  logout(state: STSState) {
    state = new STSState();

    localStorage.clear();
  },
  addRole(state: STSState, payload: Role) {
    const newLength = state.roles.push(payload);
    state.currentRole = newLength - 1;
  },
  switchRole(state: STSState, roleIndex: number) {
    state.currentRole = roleIndex;
  },
  backToMain(state: STSState, skipSwitchRole?: boolean) {
    if (!skipSwitchRole) {
      state.currentRole = -1;
    }
    AWS.config = new AWS.Config();

    if (state.loginMethod === "cognito") {
      AWS.config.credentials = state.credentials;
    } else {
      AWS.config.accessKeyId = state.accessKeyId;
      AWS.config.secretAccessKey = state.secretAccessKey;
    }
  },

  routeAfterLogin(state: STSState, to) {
    state.routeAfterLogin = to;
  },

  showRegionsModal(state: STSState, enabled) {
    state.showRegionsModal = enabled;
  }
} as MutationTree<STSState>;
