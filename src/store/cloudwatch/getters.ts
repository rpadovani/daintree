import { GetterTree } from "vuex";
import { CloudwatchState } from "@/store/cloudwatch/state";

export const CloudwatchGetters = {
  visible: function (state) {
    return state.visible;
  },
  modalTitle: function (state) {
    return state.modalTitle;
  },
  requestParameters: function (state) {
    return state.requestParameters;
  },
  region: function (state) {
    return state.region;
  },
  xAxis: function (state) {
    return state.xAxis;
  },
  yAxis: function (state) {
    return state.yAxis;
  },
} as GetterTree<CloudwatchState, any>;
