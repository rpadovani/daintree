<template>
  <gl-intersection-observer
    class="col-12"
    v-gl-resize-observer-directive="handleResize"
    @appear="appear"
  >
    <img
      :src="imageData"
      class="highlightOnHover"
      alt="Loading..."
      @click="openModal"
      v-if="!loading"
    />
    <gl-skeleton-loader v-if="loading" />
  </gl-intersection-observer>
</template>

<script lang="ts">
import { Component, Prop } from "vue-property-decorator";
import {
  GlIntersectionObserver,
  GlSkeletonLoader,
  GlResizeObserverDirective,
} from "@gitlab/ui";
import CloudwatchClient, {
  GetMetricDataInput,
  Metric,
  MetricDataQueries,
} from "aws-sdk/clients/cloudwatch";
import { mapGetters } from "vuex";
import { DaintreeCredentials } from "@/store/sts/state";
import Notifications from "@/mixins/notifications";
import * as echarts from "echarts";

@Component({
  computed: {
    ...mapGetters("sts", {
      credentials: "credentials",
    }),
  },
  components: {
    GlIntersectionObserver,
    GlSkeletonLoader,
  },
  directives: {
    GlResizeObserverDirective,
  },
})
export default class CloudwatchWidget extends Notifications {
  @Prop(String) readonly region!: string;
  @Prop(Array) readonly metrics!: Metric[];

  @Prop(Date) readonly start: Date | undefined;
  @Prop(Date) readonly end: Date | undefined;
  @Prop(Boolean) readonly liveData: boolean | undefined;
  @Prop(Number) readonly period: number | undefined;

  @Prop(Number) readonly height: number | undefined;
  @Prop(Number) readonly width: number | undefined;
  @Prop(Object) readonly xAxis: echarts.EChartOption.XAxis | undefined;
  @Prop(Object) readonly yAxis: echarts.EChartOption.YAxis | undefined;
  @Prop(String) readonly graphTitle: string | undefined;
  @Prop(String) readonly label: string | undefined;

  @Prop(Object) readonly legend:
    | { position: "bottom" | "right" | "hidden" }
    | undefined;

  @Prop(String) readonly stat:
    | "SampleCount"
    | "Average"
    | "Sum"
    | "Minimum"
    | "Maximum"
    | undefined;

  alreadyLoaded = false;
  loading = false;

  elWidth = 0;
  elHeight = 0;

  protected credentials!: DaintreeCredentials;

  metricImage: any = "";

  get imageData(): string {
    if (!this.metricImage) {
      return "";
    }
    const blob = new Blob([this.metricImage], { type: "image/png" });
    return URL.createObjectURL(blob);
  }

  get metricWidget(): string {
    const parameters: {
      metrics: string[][];
      region: string;
      start?: Date;
      end?: Date;
      liveData?: boolean;
      period?: number;
      height?: number;
      width?: number;
      stat?: string;
      legend?: { position: "bottom" | "right" | "hidden" };
      title?: string;
      yAxis: { left: { min: number } };
    } = {
      region: this.region,
      metrics: [],
      yAxis: {
        left: {
          min: 0,
        },
      },
    };

    this.metrics.forEach((metric) => {
      if (metric.Namespace && metric.MetricName) {
        const parameter = [metric.Namespace, metric.MetricName];
        metric.Dimensions?.forEach((dimension) => {
          parameter.push(dimension.Name, dimension.Value);
        });

        parameters.metrics.push(parameter);
      }
    });

    if (this.start) {
      parameters.start = this.start;
    }
    if (this.end) {
      parameters.end = this.end;
    }
    if (this.liveData !== undefined) {
      parameters.liveData = this.liveData;
    }
    if (this.period) {
      parameters.period = this.period;
    }

    if (this.width) {
      parameters.width = this.width;
    } else {
      parameters.width = Math.round(this.elWidth) - 20;
    }

    if (this.height) {
      parameters.height = this.height;
    } else {
      parameters.height = Math.round((parameters.width / 16) * 9);
    }

    if (this.stat) {
      parameters.stat = this.stat;
    }

    if (this.legend) {
      parameters.legend = this.legend;
    }

    if (this.graphTitle) {
      parameters.title = this.graphTitle;
    }

    return JSON.stringify(parameters);
  }

  //We load it only if it is visible, but only once, then we reuse the same data
  appear() {
    if (!this.alreadyLoaded) {
      this.alreadyLoaded = true;
      this.getData();
    }
  }

  handleResize({
    contentRect: { width, height },
  }: {
    contentRect: { width: number; height: number };
  }) {
    this.elWidth = width;
    this.elHeight = height;
  }

  smallFirstLetter(word: string): string {
    return word.charAt(0).toLowerCase() + word.slice(1);
  }

  openModal() {
    const MetricDataQueries: MetricDataQueries = [];

    this.metrics.forEach((metric) => {
      MetricDataQueries.push({
        Id: this.smallFirstLetter(this.stat || "Average"),
        MetricStat: {
          Metric: metric,
          Period: this.period || 300,
          Stat: this.stat || "Average",
        },
        Period: this.period,
        Label: this.label,
      });
    });

    const threeHoursAgo = new Date();
    threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);
    const start = this.start || threeHoursAgo;
    const end = this.end || new Date();

    const params: GetMetricDataInput = {
      EndTime: end,
      StartTime: start,
      MetricDataQueries,
    };

    const payload = {
      region: this.region,
      params,
      modalTitle: this.graphTitle,
      xAxis: this.xAxis,
      yAxis: this.yAxis,
    };

    this.$store.commit("cloudwatch/show", payload);
  }

  getData() {
    this.loading = true;
    const cloudwatch = new CloudwatchClient({
      region: this.region,
      credentials: this.credentials,
    });

    this.metricImage = "";
    cloudwatch.getMetricWidgetImage(
      { MetricWidget: this.metricWidget },
      (err, data) => {
        this.loading = false;
        if (err) {
          this.showError(err.message, "getMetricWidgetImage");
        } else {
          this.metricImage = data.MetricWidgetImage;
        }
      }
    );
  }
}
</script>

<style scoped>
.highlightOnHover {
  border: 5px solid transparent;
}

.highlightOnHover:hover {
  border: 5px solid #4977a5;
}
</style>
