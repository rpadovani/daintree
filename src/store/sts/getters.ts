import { GetterTree } from "vuex";
import { STSState } from "@/store/sts/state";

export const STSGetters = {
  isLoggedIn: function(state) {
    return state.loginMethod !== undefined;
  },
  userArn: function(state) {
    return state.userArn;
  },
  account: function(state) {
    return state.accountID;
  },
  regions: function(state) {
    return state.regionsEnabled;
  },
  currentPrettyCredentials: function(state) {
    if (state.currentRole === -1) {
      let credential = "";

      const elements = state?.userArn?.split("/");
      if (elements && elements.length > 0) {
        //When logged with access key, we take the last element, that is the username
        //When logged with cognito, we take the one before, because the last one is `CognitoIdentityCredentials`
        const subtraction = state.loginMethod === "cognito" ? 2 : 1;
        credential += elements[elements.length - subtraction];
      }

      if (state.accountID) {
        credential += ` @ ${state.accountID}`;
      }

      return credential;
    }

    if (state.roles[state.currentRole].nickname) {
      return state.roles[state.currentRole].nickname;
    }

    return `${state.roles[state.currentRole].role} @ ${
      state.roles[state.currentRole].accountId
    }`;
  },
  roles: function(state) {
    return state.roles;
  },
  currentRoleIndex: function(state) {
    return state.currentRole;
  },
  mainAccountUsername: function(state) {
    const elements = state?.userArn?.split("/");
    if (elements && elements.length > 0) {
      return elements[elements.length - 1];
    }

    return "";
  },
  routeAfterLogin: function(state) {
    return state.routeAfterLogin || "/home";
  },
  showRegionsModal: function(state) {
    return state.showRegionsModal;
  }
} as GetterTree<STSState, any>;
