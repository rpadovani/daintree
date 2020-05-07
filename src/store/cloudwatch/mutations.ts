import { MutationTree } from "vuex";
import { CloudwatchState } from "@/store/cloudwatch/state";

export const CloudwatchMutations = {
  show(state: CloudwatchState, payload) {
    state.requestParameters = payload.params;
    state.region = payload.region;
    state.modalTitle = payload.modalTitle;
    state.visible = true;
    if (payload.xAxis) {
      state.xAxis = payload.xAxis;
    }

    if (payload.yAxis) {
      state.yAxis = payload.yAxis;
    } else {
      state.yAxis = { name: "Count" };
    }
  },

  hide(state: CloudwatchState) {
    state.visible = false;
  },
} as MutationTree<CloudwatchState>;
