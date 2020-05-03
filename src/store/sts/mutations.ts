import { MutationTree } from "vuex";
import { Role, STSState } from "@/store/sts/state";

export const STSMutations = {
  login(state: STSState, { arn, account, credentials }) {
    state.userArn = arn;
    state.accountID = account;
    state.credentials = credentials;
    state.loginMethod = "accessKey";

    sessionStorage.setItem(
      "loginData",
      JSON.stringify({
        userArn: arn,
        accountID: account,
        credentials,
        loginMethod: "accessKey",
      })
    );
  },
  loginWithCognito(state: STSState, { accountId, userArn, credentials }) {
    state.loginMethod = "cognito";
    state.accountID = accountId;
    state.userArn = userArn;
    state.credentials = credentials;

    sessionStorage.setItem(
      "loginData",
      JSON.stringify({
        userArn,
        accountID: accountId,
        credentials,
        loginMethod: "cognito",
      })
    );
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
    state.currentCredentials = payload.credentials;
  },
  switchRole(state: STSState, { roleIndex, credentials }) {
    state.currentRole = roleIndex;
    state.currentCredentials = credentials;
  },
  backToMain(state: STSState, skipSwitchRole?: boolean) {
    if (!skipSwitchRole) {
      state.currentRole = -1;
    }

    state.currentCredentials = undefined;
  },

  routeAfterLogin(state: STSState, to) {
    state.routeAfterLogin = to;
  },

  showRegionsModal(state: STSState, enabled) {
    state.showRegionsModal = enabled;
  },
} as MutationTree<STSState>;
