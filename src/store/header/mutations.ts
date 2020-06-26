import { MutationTree } from "vuex";
import { HeaderState } from "@/store/header/state";

export const HeaderMutations = {
  showSubHeader(state: HeaderState) {
    state.subHeaderVisible = true;
  },

  hideSubHeader(state: HeaderState) {
    state.subHeaderVisible = false;
  },

  showRefresher(state: HeaderState) {
    state.hideLoader = false;
  },

  hideRefresher(state: HeaderState) {
    state.hideLoader = true;
  },

  incrementLoadingCount(state: HeaderState) {
    state.loadingCount++;
  },

  decreaseLoadingCount(state: HeaderState) {
    state.loadingCount--;

    if (state.loadingCount === 0) {
      state.lastRefresh = new Date();
    }
  },
} as MutationTree<HeaderState>;
