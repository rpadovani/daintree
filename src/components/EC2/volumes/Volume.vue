<template>
  <gl-tabs theme="blue">
    <gl-tab title="Overview">
      <gl-modal
        modal-id="delete-volume-modal"
        :title="`Delete ${volumeName}`"
        no-fade
        :action-primary="deleteVolumeButtonProps"
        :action-cancel="cancelProps"
        @primary="deleteVolume"
      >
        Are you sure that you want to delete this volume ({{ volumeName }})?
      </gl-modal>

      <!--      <gl-modal-->
      <!--        modal-id="edit-volume-modal"-->
      <!--        :title="`Edit ${volumeName}`"-->
      <!--        no-fade-->
      <!--        :action-primary="editVolumeButtonProps"-->
      <!--        :action-cancel="cancelProps"-->
      <!--        @primary="editVolume"-->
      <!--      >-->
      <!--      </gl-modal>-->
      <div class="col-12 text-center">
        <gl-button-group>
          <!--          <gl-button-->
          <!--            variant="warning"-->
          <!--            category="secondary"-->
          <!--            v-gl-modal-directive="'edit-volume-modal'"-->
          <!--            >Modify this volume-->
          <!--          </gl-button>-->
          <gl-button
            variant="danger"
            category="secondary"
            v-gl-modal-directive="'delete-volume-modal'"
            :disabled="volume.Attachments.length !== 0"
            v-gl-tooltip.hover
            :title="deleteButtonTitle"
            >Delete this volume
          </gl-button>
        </gl-button-group>
      </div>

      <DrawerCards :cards="overviewCards" />

      <h5 class="mt-3">Tags</h5>
      <!--I use key to force a rerender, I should study Vue reactivity better ¯\_(ツ)_/¯ -->
      <TagsTable
        :key="volume.VolumeId"
        :tags="volume.Tags"
        :region="volume.region"
        :resource-id="volume.VolumeId"
      />
    </gl-tab>

    <gl-tab title="Attachments">
      <gl-modal
        modal-id="detach-volume-modal"
        :title="`Detach ${volumeName}`"
        no-fade
        :action-primary="detachVolumeButtonProps"
        :action-cancel="cancelProps"
        @primary="detachVolume"
      >
        <gl-alert variant="warning" class="mb-2 mt-2" :dismissible="false">
          Make sure to unmount any file systems on the device within your
          operating system before detaching the volume. Failure to do so can
          result in the volume becoming stuck in the busy state while detaching.
          If this happens, detachment can be delayed indefinitely until you
          unmount the volume, force detachment, reboot the instance, or all
          three. If an EBS volume is the root device of an instance, it can't be
          detached while the instance is running. To detach the root volume,
          stop the instance first.
        </gl-alert>

        Are you sure that you want to detach this volume ({{ volumeName }})?
      </gl-modal>

      <div class="col-12 text-center">
        <gl-button-group>
          <!--          <gl-button-->
          <!--            variant="success"-->
          <!--            category="secondary"-->
          <!--            v-gl-modal-directive="'attach-volume-modal'"-->
          <!--            :disabled="volume.Attachments.length !== 0"-->
          <!--            >Attach this volume-->
          <!--          </gl-button>-->
          <gl-button
            variant="danger"
            category="secondary"
            v-gl-modal-directive="'detach-volume-modal'"
            :disabled="volume.Attachments.length === 0"
            >Detach this volume
          </gl-button>
        </gl-button-group>
      </div>
      <gl-table
        :items="volume.Attachments"
        :fields="attachmentsFields"
        borderless
        small
        hover
        show-empty
        empty-text="Daintree hasn't found any instance using this volume!"
      >
        <template v-slot:cell(InstanceId)="data">
          <gl-link :to="`/ec2/instances?instanceId=${data.value}`">
            {{ data.value }}
          </gl-link>
        </template>
        <template v-slot:cell(state)="data">
          <StateText :state="data.value" />
        </template>
      </gl-table>

      <h5 class="mt-3">Related EC2 instances</h5>
      <RelatedInstances
        :region="volume.region"
        filter-key="block-device-mapping.volume-id"
        :filter-value="this.volume.VolumeId"
      />
    </gl-tab>

    <gl-tab title="Status check" @click="retrieveVolumeStatus">
      <DrawerCards :cards="statusCards" />
    </gl-tab>

    <gl-tab title="Snapshots">
      <div class="col-12 text-center">
        <gl-button
          variant="success"
          category="secondary"
          :to="linkToCreateSnapshot"
          >Create snapshot
        </gl-button>
      </div>
      <SnapshotTab :volume-id="volume.VolumeId" :region="volume.region" />
    </gl-tab>

    <gl-tab title="Monitoring">
      <div class="row justify-content-between">
        <CloudwatchWidget
          class="col-12 col-md-6 col-lg-4"
          v-for="widget in cloudwatchWidgets"
          :metrics="widget.metrics"
          :live-data="false"
          :stat="widget.stat"
          :region="volume.region"
          :key="widget.graphTitle + volume.VolumeId"
          :legend="{ position: 'hidden' }"
          :graph-title="widget.graphTitle"
          :label="volumeName"
          :y-axis="widget.yAxis"
        />
      </div>
    </gl-tab>
  </gl-tabs>
</template>

<script lang="ts">
import {
  GlEmptyState,
  GlSkeletonLoading,
  GlTable,
  GlCard,
  GlAlert,
  GlButton,
  GlModal,
  GlModalDirective,
  GlTabs,
  GlTab,
  GlButtonGroup,
  GlTooltipDirective,
  GlLink,
} from "@gitlab/ui";
import EC2Client, { VolumeStatusInfo } from "aws-sdk/clients/ec2";
import { Component, Prop } from "vue-property-decorator";
import TagsTable from "@/components/common/TagsTable.vue";
import FlowLogsTab from "@/components/network/flowLogs/FlowLogsTab.vue";
import SubnetTab from "@/components/network/subnets/SubnetTab.vue";
import { volumes } from "@/components/EC2/volumes/volume";
import VolumeWithRegion = volumes.VolumeWithRegion;
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import StateText from "@/components/common/StateText.vue";
import RegionText from "@/components/common/RegionText.vue";
import CloudwatchWidget from "@/components/cloudwatch/CloudwatchWidget.vue";
import SnapshotTab from "@/components/EC2/snapshots/SnapshotTab.vue";
import RelatedInstances from "@/components/EC2/instances/RelatedInstances.vue";
import DrawerCards from "@/components/common/DrawerCards.vue";
import { CardContent } from "@/components/common/cardContent";
import { Formatters } from "@/mixins/formatters";
import { mixins } from "vue-class-component";

@Component({
  components: {
    RelatedInstances,
    SnapshotTab,
    TagsTable,
    GlTable,
    GlEmptyState,
    GlSkeletonLoading,
    GlCard,
    GlAlert,
    GlButton,
    GlModal,
    FlowLogsTab,
    SubnetTab,
    StateText,
    RegionText,
    GlTab,
    GlTabs,
    GlButtonGroup,
    GlLink,
    CloudwatchWidget,
    DrawerCards,
  },
  directives: {
    "gl-modal-directive": GlModalDirective,
    "gl-tooltip": GlTooltipDirective,
  },
})
export default class Volume extends mixins(DaintreeComponent, Formatters) {
  @Prop(Object) readonly volume!: VolumeWithRegion;

  deleteVolumeButtonProps = {
    text: "Delete volume",
    attributes: {
      variant: "danger",
    },
  };

  detachVolumeButtonProps = {
    text: "Detach volume",
    attributes: {
      variant: "danger",
    },
  };

  cancelProps = {
    text: "Cancel",
  };

  attachmentsFields = [
    "Device",
    { key: "InstanceId", sortable: true },
    "State",
    "DeleteOnTermination",
    { key: "AttachTime", formatter: this.standardDate },
  ];

  get volumeName(): string {
    const tagName = this.extractNameFromTags(this.volume.Tags || []);

    return tagName || this.volume.VolumeId || "";
  }

  get overviewCards(): CardContent[] {
    return [
      {
        title: "Volume Size",
        value: `${this.volume.Size} GiB`,
        helpText: "The size of the volume, in GiBs.",
      },
      {
        title: "Volume type",
        value: this.volume.VolumeType,
        helpText:
          "The volume type. This can be gp2 for General Purpose SSD, io1 for Provisioned IOPS SSD, st1 for Throughput Optimized HDD, sc1 for Cold HDD, or standard for Magnetic volumes.",
      },
      {
        title: "Iops",
        value: this.volume.Iops,
        helpText:
          "The number of I/O operations per second (IOPS) that the volume supports.",
      },
      {
        title: "Availability zone",
        value: this.volume.AvailabilityZone,
        isAz: true,
        helpText: "The Availability Zone for the volume.",
      },
      {
        title: "Creation time",
        value: this.volume.CreateTime
          ? this.standardDate(this.volume.CreateTime)
          : undefined,
        helpText: "The time stamp when volume creation was initiated.",
      },
      {
        title: "Volume ID",
        value: this.volume.VolumeId,
        helpText: "The ID of the volume.",
      },
    ];
  }

  get statusCards(): CardContent[] {
    return [
      { title: "Volume Status", value: this.volumeStatus.Status },
      { title: "IO enabled", value: this.ioEnabled },
      { title: "IO performance", value: this.ioPerformance },
    ];
  }

  get deleteButtonTitle(): string {
    if (this.volume.Attachments && this.volume.Attachments?.length > 0) {
      return "You need to remove all attachments before deleting the EBS";
    }

    return "Delete the EBS";
  }

  get linkToCreateSnapshot(): string {
    return `/ec2/snapshots/new?region=${this.volume.region}&volumeId=${this.volume.VolumeId}`;
  }

  get defaultCloudwatchMetric() {
    if (!this.volume.VolumeId) {
      return {};
    }

    const namespace = "AWS/EBS";

    return {
      Namespace: namespace,
      Dimensions: [
        {
          Name: "VolumeId",
          Value: this.volume.VolumeId,
        },
      ],
    };
  }

  createMetrics(metricName: string) {
    return [
      Object.assign({}, this.defaultCloudwatchMetric, {
        MetricName: metricName,
      }),
    ];
  }

  get cloudwatchWidgets() {
    return [
      {
        metrics: this.createMetrics("VolumeReadBytes"),
        stat: "Sum",
        graphTitle: "Read bandwidth",
        yAxis: { name: "Bytes/s" },
        unit: "Kilobytes/Second",
      },
      {
        metrics: this.createMetrics("VolumeWriteBytes"),
        stat: "Sum",
        graphTitle: "Write bandwidth",
        yAxis: { name: "Bytes/s" },
      },
      {
        metrics: this.createMetrics("VolumeReadOps"),
        stat: "Sum",
        graphTitle: "Read throughput",
        yAxis: { name: "Ops/s" },
      },
      {
        metrics: this.createMetrics("VolumeWriteOps"),
        stat: "Sum",
        graphTitle: "Write throughput",
        yAxis: { name: "Ops/s" },
      },
      {
        metrics: this.createMetrics("VolumeQueueLength"),
        stat: "Average",
        graphTitle: "Average queue length",
        yAxis: { name: "Operations" },
      },
      {
        metrics: this.createMetrics("VolumeIdleTime"),
        stat: "Average",
        graphTitle: "Time spent idle",
        yAxis: { name: "Sum" },
      },
      {
        metrics: this.createMetrics("BurstBalance"),
        stat: "Minimum",
        graphTitle: "Burst balance",
        yAxis: { name: "Percent" },
      },
    ];
  }

  async EC2Client(): Promise<EC2Client | void> {
    const credentials = await this.credentials();

    if (credentials === undefined) {
      return;
    }

    return new EC2Client({ region: this.volume.region, credentials });
  }

  volumeStatus: VolumeStatusInfo = {};

  get ioEnabled(): string {
    if (this.volumeStatus.Details && this.volumeStatus.Details.length > 0) {
      const filtered = this.volumeStatus.Details.filter(
        (d) => d.Name === "io-enabled"
      );
      if (filtered.length > 0) {
        return filtered[0].Status || "";
      }
    }
    return "N/A";
  }

  get ioPerformance(): string {
    if (this.volumeStatus.Details && this.volumeStatus.Details.length > 0) {
      const filtered = this.volumeStatus.Details.filter(
        (d) => d.Name === "io-performance"
      );
      if (filtered.length > 0) {
        return filtered[0].Status || "";
      }
    }
    return "N/A";
  }

  async retrieveVolumeStatus(): Promise<void> {
    if (!this.volume.VolumeId) {
      return;
    }

    const EC2 = await this.EC2Client();

    if (!EC2) {
      return;
    }

    try {
      this.hideErrors("retrieveVolumeStatus");
      const response = await EC2.describeVolumeStatus({
        VolumeIds: [this.volume.VolumeId],
      }).promise();

      if (
        response.VolumeStatuses &&
        response.VolumeStatuses?.length > 0 &&
        response.VolumeStatuses[0].VolumeStatus
      ) {
        this.volumeStatus = response.VolumeStatuses[0].VolumeStatus;
      }
    } catch (err) {
      this.showError(err.message, "retrieveVolumeStatus");
    }
  }

  async deleteVolume(): Promise<void> {
    if (!this.volume.VolumeId) {
      return;
    }

    const EC2 = await this.EC2Client();

    if (!EC2) {
      return;
    }

    try {
      this.hideErrors("deleteVolume");
      await EC2.deleteVolume({ VolumeId: this.volume.VolumeId }).promise();

      this.showAlert({
        variant: "info",
        text: `Deleting volume ${this.volume.VolumeId}`,
        key: "deletingVolume",
        resourceId: this.volume.VolumeId,
      });
      this.$emit("deleted");
    } catch (err) {
      this.showError(err.message, "deleteVolume");
    }
  }

  async detachVolume(): Promise<void> {
    if (!this.volume.VolumeId) {
      return;
    }

    const EC2 = await this.EC2Client();

    if (!EC2) {
      return;
    }

    try {
      this.hideErrors("detachVolume");
      await EC2.detachVolume({ VolumeId: this.volume.VolumeId }).promise();

      this.showAlert({
        variant: "info",
        text: `Detaching volume ${this.volume.VolumeId}`,
        key: "detachingVolume",
        resourceId: this.volume.VolumeId,
      });
    } catch (err) {
      this.showError(err.message, "detachVolume");
    }
  }
}
</script>

<style scoped>
.hidden-header {
  display: none;
}
</style>
