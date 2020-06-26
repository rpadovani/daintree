import { GetterTree } from "vuex";
import { HeaderState } from "@/store/header/state";

export const HeaderGetters = {
  isSubHeaderVisible: function (state) {
    return state.subHeaderVisible;
  },
  isLoaderVisible: function (state) {
    return !state.hideLoader;
  },
  isLoading: function (state) {
    return state.loadingCount > 0;
  },
  lastRefresh: function (state) {
    return state.lastRefresh;
  },
} as GetterTree<HeaderState, any>;
