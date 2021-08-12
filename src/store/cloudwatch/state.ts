import { GetMetricDataInput } from "aws-sdk/clients/cloudwatch";

export class CloudwatchState {
  visible = false;
  requestParameters: GetMetricDataInput | undefined = undefined;
  region: string | undefined = undefined;
  modalTitle: string | undefined = undefined;

  xAxis: any = {
    name: "Time",
    type: "category",
  };

  yAxis: any = {
    name: "Count",
  };
}
