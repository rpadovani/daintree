import { MutationTree } from "vuex";
import { Role, STSState } from "@/store/sts/state";

export const STSMutations = {
  login(state: STSState, { arn, account, credentials, loginMethod }) {
    state.userArn = arn;
    state.accountID = account;
    state.credentials = credentials;
    state.loginMethod = loginMethod;

    sessionStorage.setItem(
      "loginData",
      JSON.stringify({
        userArn: arn,
        accountID: account,
        loginMethod,
      })
    );

    sessionStorage.setItem("accessKeyId", credentials.accessKeyId);
    sessionStorage.setItem("secretAccessKey", credentials.secretAccessKey);
  },
  setEnabledRegions(state: STSState, regions) {
    state.regionsEnabled = regions;

    localStorage.setItem("regionsEnabled", JSON.stringify(regions));
  },
  logout(state: STSState) {
    state = new STSState();

    sessionStorage.clear();
    localStorage.clear();
  },
  addRole(state: STSState, payload: Role) {
    const newLength = state.roles.push(payload);
    state.currentRole = newLength - 1;
    state.currentCredentials = payload.credentials;

    if (payload.remember) {
      const currentRoles = JSON.parse(localStorage.getItem("roles") || "[]");
      currentRoles.push(payload);
      localStorage.setItem("roles", JSON.stringify(currentRoles));
    }
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
