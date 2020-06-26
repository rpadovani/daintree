<template>
  <gl-modal
    modal-id="cloudwatch-modal-id"
    ref="cloudwatchModal"
    :title="modalTitle"
    size="lg"
    no-fade
    :action-primary="hideButton"
    :action-cancel="hideButton"
    @close="modalClosed"
  >
    <div class="row justify-content-between pl-5 pr-5">
      <div>
        Statistic
        <gl-new-dropdown class="ml-2" icon="tachometer" :text="stat">
          <gl-dropdown-item @click="() => (selectedStat = 'Sum')">
            Sum
          </gl-dropdown-item>
          <gl-dropdown-item @click="() => (selectedStat = 'Average')">
            Average
          </gl-dropdown-item>
          <gl-dropdown-item @click="() => (selectedStat = 'Minimum')">
            Minimum
          </gl-dropdown-item>
          <gl-dropdown-item @click="() => (selectedStat = 'Maximum')">
            Maximum
          </gl-dropdown-item>
          <gl-dropdown-item @click="() => (selectedStat = 'Sample Count')">
            Sample Count
          </gl-dropdown-item>
        </gl-new-dropdown>
      </div>

      <div>
        Period
        <gl-new-dropdown class="ml-2" icon="timer" :text="period">
          <gl-dropdown-item @click="() => (selectedPeriod = 60)">
            1 minute
          </gl-dropdown-item>
          <gl-dropdown-item @click="() => (selectedPeriod = 60 * 5)">
            5 minutes
          </gl-dropdown-item>
          <gl-dropdown-item @click="() => (selectedPeriod = 60 * 15)">
            15 minutes
          </gl-dropdown-item>
          <gl-dropdown-item @click="() => (selectedPeriod = 60 * 60)">
            1 hour
          </gl-dropdown-item>
          <gl-dropdown-item @click="() => (selectedPeriod = 60 * 60 * 6)">
            6 hours
          </gl-dropdown-item>
          <gl-dropdown-item @click="() => (selectedPeriod = 60 * 60 * 24)">
            1 day
          </gl-dropdown-item>
        </gl-new-dropdown>
      </div>

      <div>
        Time range
        <gl-new-dropdown class="ml-2" icon="clock" :text="timeRange">
          <gl-dropdown-item @click="() => (selectedTimeRange = 60 * 60)">
            Last 1 hour
          </gl-dropdown-item>
          <gl-dropdown-item @click="() => (selectedTimeRange = 60 * 60 * 3)">
            Last 3 hours
          </gl-dropdown-item>
          <gl-dropdown-item @click="() => (selectedTimeRange = 60 * 60 * 6)">
            Last 6 hours
          </gl-dropdown-item>
          <gl-dropdown-item @click="() => (selectedTimeRange = 60 * 60 * 12)">
            Last 12 hours
          </gl-dropdown-item>
          <gl-dropdown-item @click="() => (selectedTimeRange = 60 * 60 * 24)">
            Last 24 hours
          </gl-dropdown-item>
          <gl-dropdown-item
            @click="() => (selectedTimeRange = 60 * 60 * 24 * 3)"
          >
            Last 3 days
          </gl-dropdown-item>
          <gl-dropdown-item
            @click="() => (selectedTimeRange = 60 * 60 * 24 * 7)"
          >
            Last 1 week
          </gl-dropdown-item>
          <gl-dropdown-item
            @click="() => (selectedTimeRange = 60 * 60 * 24 * 14)"
          >
            Last 2 weeks
          </gl-dropdown-item>
        </gl-new-dropdown>
      </div>

      <div class="mt-1 mr-0 pr-3">
        <gl-icon
          class="float-right"
          v-if="!loading"
          name="retry"
          @click="getData"
        />
        <gl-loading-icon
          class="float-right"
          v-if="loading"
          inline
          label="Loading"
        ></gl-loading-icon>
      </div>
    </div>
    <gl-line-chart
      ref="lineChart"
      :data="lineData"
      :option="chartOptions"
      class="col-12 mt-4"
      legend-layout="table"
    />
  </gl-modal>
</template>

<script lang="ts">
import { Component, Ref, Watch } from "vue-property-decorator";
import { mapGetters } from "vuex";
import { BvModal } from "bootstrap-vue";
import {
  GlModal,
  GlNewDropdown,
  GlDropdownItem,
  GlDaterangePicker,
  GlIcon,
  GlLoadingIcon,
} from "@gitlab/ui";
import { GlLineChart } from "@gitlab/ui/charts";
import CloudwatchClient, {
  GetMetricDataInput,
  MetricDataResult,
} from "aws-sdk/clients/cloudwatch";
import { Credentials } from "aws-sdk/lib/core";
import Notifications from "@/mixins/notifications";

@Component({
  components: {
    GlModal,
    GlLineChart,
    GlNewDropdown,
    GlDropdownItem,
    GlDaterangePicker,
    GlIcon,
    GlLoadingIcon,
  },
  computed: {
    ...mapGetters("cloudwatch", {
      visible: "visible",
      requestParameters: "requestParameters",
      region: "region",
      modalTitle: "modalTitle",
      xAxis: "xAxis",
      yAxis: "yAxis",
    }),
    ...mapGetters("sts", {
      credentials: "credentials",
    }),
  },
})
export default class CloudwatchModal extends Notifications {
  @Ref() readonly cloudwatchModal!: BvModal;

  protected readonly requestParameters!: GetMetricDataInput | undefined;
  protected readonly region!: string;
  protected readonly credentials!: Credentials;
  protected readonly visible!: boolean;
  protected readonly xAxis!: echarts.EChartOption.XAxis;
  protected readonly yAxis!: echarts.EChartOption.YAxis;

  loading = false;

  selectedStat:
    | "SampleCount"
    | "Average"
    | "Sum"
    | "Minimum"
    | "Maximum"
    | string
    | null = null;

  selectedPeriod: number | null = null;
  selectedTimeRange: number | null = null;

  hideButton = {
    attributes: [{ hidden: true }],
  };

  get chartOptions(): echarts.EChartOption {
    return {
      xAxis: this.xAxis,
      yAxis: this.yAxis,
      toolbox: {
        feature: {
          dataZoom: {
            icon: {
              zoom:
                "path://M2 7h2v2H2zm7-5v2H7V2zm3.6 9.24l1.08 1.042a1 1 0 1 1-1.39 1.439l-1.079-1.042-.695.719a.5.5 0 0 1-.815-.142L7.493 8.344a.5.5 0 0 1 .645-.668l4.986 2.034a.5.5 0 0 1 .171.81zM2 5V3a1 1 0 0 1 1-1h2v2H4v1zm10-1h-1V2h2a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0V4zm-7 8a1 1 0 0 1 0 2H3a1 1 0 0 1-1-1v-2h2v1z",
              back:
                "path://M5.413 4.949L6.904 6.44a.328.328 0 0 1-.232.56H2.328A.328.328 0 0 1 2 6.672V2.328a.328.328 0 0 1 .56-.232l1.435 1.436a6 6 0 1 1 .455 9.306 1 1 0 1 1 1.184-1.612 4 4 0 1 0-.222-6.277z",
            },
          },
          restore: {
            icon:
              "path://M2.004 9.136h2.052a3.998 3.998 0 0 0 3.918 2.88c2.208-.039 3.968-1.846 3.93-4.037a3.936 3.936 0 0 0-.995-2.55L9.444 6.936a.33.33 0 0 1-.564-.22l-.075-4.309a.326.326 0 0 1 .322-.33L13.47 2a.33.33 0 0 1 .234.091c.13.125.134.33.008.46L12.302 4a5.912 5.912 0 0 1 1.6 3.945c.059 3.286-2.58 5.997-5.893 6.054-2.975.052-5.482-2.054-6.005-4.863zM14 7.856v.365a5.861 5.861 0 0 0 0-.365zM2.084 9.036h2.044zM4 8.046H2a5.919 5.919 0 0 1 .246-1.686l1.903.618A4.017 4.017 0 0 0 4 8.045zm.612-2.11L2.942 4.84A5.96 5.96 0 0 1 4.405 3.28l1.054 1.7c-.329.269-.616.59-.847.956zm1.247-3.451a6.017 6.017 0 0 1 1.942-.39v1.985a4.013 4.013 0 0 0-1.273.275z",
          },
          saveAsImage: {
            icon:
              "path://M14 9a1 1 0 0 1 1 1v3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-3a1 1 0 0 1 2 0v3h10v-3a1 1 0 0 1 1-1zM8 1a1 1 0 0 1 1 1v4.586l1.293-1.293a1 1 0 1 1 1.414 1.414L8 10.414 4.293 6.707a1 1 0 0 1 1.414-1.414L7 6.586V2a1 1 0 0 1 1-1z",
          },
        },
      },
    };
  }

  rawData: MetricDataResult[] = [];

  modalClosed() {
    this.$store.commit("cloudwatch/hide");
  }

  get stat(): string {
    return (
      this.selectedStat ||
      this.requestParameters?.MetricDataQueries[0].MetricStat?.Stat ||
      "Average"
    );
  }

  get period(): string {
    return this.humanizePeriod(
      this.selectedPeriod ||
        this.requestParameters?.MetricDataQueries[0].MetricStat?.Period ||
        60 * 60 * 3 // default 3 hours
    );
  }

  get timeRange(): string {
    let result = "3 hours";

    if (this.selectedTimeRange) {
      result = this.humanizePeriod(this.selectedTimeRange);
    } else if (
      this.requestParameters?.EndTime &&
      this.requestParameters?.StartTime
    ) {
      const difference = this.differenceBetweenDates(
        this.requestParameters.StartTime,
        this.requestParameters.EndTime
      );
      result = this.humanizePeriod(difference);
    }

    return `Last ${result}`;
  }

  get lineData() {
    const result: {
      name: string | undefined;
      data: [string | undefined, number][];
    }[] = [];

    this.rawData.forEach((data) => {
      if (data.Values && data.Timestamps) {
        const obj: {
          name: string | undefined;
          data: [string | undefined, number][];
        } = {
          name: data.Label,
          data: [],
        };

        for (let i = 1; i <= data.Values?.length; i++) {
          const index = data.Values?.length - i; //data returned by AWS start from the most recent

          const time = data.Timestamps[index];
          let label = "";
          if ((this.selectedTimeRange || 0) > this.SECONDS_IN_DAY) {
            label = time.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "numeric",
            });
          } else {
            label = time.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
          }

          obj.data.push([label, data.Values[index]]);
        }

        result.push(obj);
      }
    });

    return result;
  }

  getData() {
    if (!this.requestParameters) {
      return;
    }

    this.loading = true;

    const requestParameters = Object.assign({}, this.requestParameters);

    //Set the stat, if changed
    if (
      this.stat !== requestParameters?.MetricDataQueries[0].MetricStat?.Stat &&
      requestParameters.MetricDataQueries[0].MetricStat?.Stat
    ) {
      let stat = this.stat;
      if (stat === "Sample Count") {
        stat = "SampleCount";
      }

      requestParameters.MetricDataQueries[0].MetricStat.Stat = stat;
    }

    //Set the period, if changed
    if (
      this.selectedPeriod &&
      this.selectedPeriod !==
        requestParameters?.MetricDataQueries[0].MetricStat?.Period &&
      requestParameters.MetricDataQueries[0].MetricStat?.Period
    ) {
      requestParameters.MetricDataQueries[0].MetricStat.Period = this.selectedPeriod;
    }

    //Set the time range, if changed
    if (this.selectedTimeRange !== null) {
      const nowInMS = Date.now();
      requestParameters.EndTime = new Date(nowInMS);
      requestParameters.StartTime = new Date(
        nowInMS - this.selectedTimeRange * 1000
      );
    }

    const cloudwatch = new CloudwatchClient({
      region: this.region,
      credentials: this.credentials,
    });

    cloudwatch.getMetricData(requestParameters, (err, data) => {
      this.loading = false;
      if (err) {
        this.showError(err.message, "cloudwatchModal");
      } else if (data.MetricDataResults) {
        this.hideErrors("cloudwatchModal");
        this.rawData = data.MetricDataResults;
        this.$nextTick().then(() =>
          //eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          this.$refs.lineChart.$children[0].setChartSize()
        );
      }
    });
  }

  @Watch("visible")
  onVisibleChanged(newValue: boolean) {
    if (newValue) {
      //Reset user settings
      this.selectedStat = null;
      this.selectedPeriod = null;
      this.selectedTimeRange = null;

      this.cloudwatchModal.show("cloudwatch-modal-id");
      this.getData();
      this.$store.commit("cloudwatch/hide"); // Be ready to be invoked again
    }
  }

  @Watch("stat")
  onStatChanged() {
    this.getData();
  }

  @Watch("period")
  onPeriodChanged() {
    this.getData();
  }

  @Watch("timeRange")
  onTimeRangeChanged() {
    this.getData();
  }

  //This method takes a duration in seconds and return a string representing in human format such duration,
  //e.g. 1 hours, or 2 weeks
  readonly SECONDS_IN_MINUTE = 60;
  readonly SECONDS_IN_HOUR = 60 * this.SECONDS_IN_MINUTE;
  readonly SECONDS_IN_DAY = 24 * this.SECONDS_IN_HOUR;
  readonly SECONDS_IN_WEEK = 7 * this.SECONDS_IN_DAY;
  humanizePeriod(seconds: number): string {
    const periods = [
      this.SECONDS_IN_WEEK,
      this.SECONDS_IN_DAY,
      this.SECONDS_IN_HOUR,
      this.SECONDS_IN_MINUTE,
    ];
    const labels = ["week", "day", "hour", "minute"];

    for (let i = 0; i < periods.length; i++) {
      if (seconds >= periods[i]) {
        const occurrences = Math.round(seconds / periods[i]);
        if (occurrences > 1) {
          return `${occurrences} ${labels[i]}s`;
        } else {
          return `1 ${labels[i]}`;
        }
      }
    }

    // No match, so we have seconds here :-)
    if (seconds === 1) {
      return `1 second`;
    } else {
      return `${seconds} seconds`;
    }
  }

  //Returns the differences in seconds between date2 - date1
  differenceBetweenDates(date1: Date, date2: Date): number {
    return Math.floor((date2.valueOf() - date1.valueOf()) / 1000);
  }

  //This is useful during development for hot reloading
  mounted() {
    if (this.visible) {
      this.onVisibleChanged(this.visible);
    }
  }
}
</script>
