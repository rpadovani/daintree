<template>
  <div v-if="instance">
    <div class="col">
      <div class="row">
        <gl-badge v-if="instance.State" :variant="badgeVariant"
          >{{ instance.State.Name }}
        </gl-badge>

        <gl-badge class="ml-1" variant="info"
          >{{ instance.InstanceType }}
        </gl-badge>
      </div>
    </div>
    <gl-tabs theme="blue" lazy>
      <gl-tab title="Overview">
        <DrawerCards :cards="overviewCards" />

        <h5 class="mt-2">Tags</h5>
        <TagsTable
          :tags="instance.Tags"
          :region="instance.region"
          :resource-id="instance.InstanceId"
        />
      </gl-tab>
      <gl-tab title="Network">
        <DrawerCards :cards="networkCards" />

        <h5 class="mt-2">Network interfaces</h5>
        <RelatedNetworkInterfaces
          :region="instance.region"
          filter-name="network-interface-id"
          :filter-values="networkInterfacesId"
        />
      </gl-tab>
      <gl-tab title="Security">
        <h6>Associated security groups</h6>
        <ul>
          <li v-for="s in instance.SecurityGroups" :key="s.GroupId">
            <router-link :to="`/network/securityGroups?GroupId=${s.GroupId}`"
              >{{ s.GroupId }} {{ s.GroupName }}
            </router-link>
          </li>
        </ul>
      </gl-tab>
      <gl-tab title="Storage">
        <DrawerCards :cards="storageCards" />

        <h5 class="mt-2">Attached devices</h5>

        <gl-table :items="instance.BlockDeviceMappings" :fields="storageFields">
          <template v-slot:cell(AttachTime)="data">
            {{ data.item.Ebs.AttachTime }}
          </template>

          <template v-slot:cell(Delete)="data">
            {{ data.item.Ebs.DeleteOnTermination }}
          </template>

          <template v-slot:cell(Status)="data">
            {{ data.item.Ebs.Status }}
          </template>

          <template v-slot:cell(ID)="data">
            {{ data.item.Ebs.VolumeId }}
          </template>
        </gl-table>
      </gl-tab>
      <gl-tab title="Monitoring">
        <div class="row justify-content-between">
          <CloudwatchWidget
            class="col-12 col-md-6 col-lg-4"
            :metrics="metricsCpuUtilization"
            :live-data="false"
            stat="Average"
            :region="instance.region"
            :key="instance.InstanceId + 'cpuUtilization'"
            :legend="{ position: 'hidden' }"
            graph-title="CPU utilization"
            :label="instance.InstanceId"
            :y-axis="{ name: 'Percent' }"
          />
          <CloudwatchWidget
            class="col-12 col-md-6 col-lg-4"
            :metrics="metricsDiskReads"
            :live-data="false"
            stat="Average"
            :region="instance.region"
            :key="instance.InstanceId + 'diskReads'"
            :legend="{ position: 'hidden' }"
            graph-title="Disk reads"
            :label="instance.InstanceId"
            :y-axis="{ name: 'Bytes' }"
          />
          <CloudwatchWidget
            class="col-12 col-md-6 col-lg-4"
            :metrics="metricsDiskReadOperations"
            :live-data="false"
            :region="instance.region"
            :key="instance.InstanceId + 'DiskReadOperations'"
            :legend="{ position: 'hidden' }"
            graph-title="Disk read operations"
            :label="instance.InstanceId"
            :y-axis="{ name: 'Operations' }"
          />
        </div>

        <div class="row justify-content-between">
          <CloudwatchWidget
            class="col-12 col-md-6 col-lg-4"
            :metrics="metricsDiskWrites"
            :live-data="false"
            stat="Average"
            :region="instance.region"
            :key="instance.InstanceId + 'diskWrites'"
            :legend="{ position: 'hidden' }"
            graph-title="Disk writes"
            :label="instance.InstanceId"
            :y-axis="{ name: 'Bytes' }"
          />

          <CloudwatchWidget
            class="col-12 col-md-6 col-lg-4"
            :metrics="metricsDiskWriteOperations"
            :live-data="false"
            :region="instance.region"
            :key="instance.InstanceId + 'DiskWriteOperations'"
            :legend="{ position: 'hidden' }"
            graph-title="Disk write operations"
            :label="instance.InstanceId"
            :y-axis="{ name: 'Operations' }"
          />

          <CloudwatchWidget
            class="col-12 col-md-6 col-lg-4"
            :metrics="metricsNetworkIn"
            :live-data="false"
            stat="Average"
            :region="instance.region"
            :key="instance.InstanceId + 'networkIn'"
            :legend="{ position: 'hidden' }"
            graph-title="Network in"
            :label="instance.InstanceId"
            :y-axis="{ name: 'Bytes' }"
          />
        </div>

        <div class="row justify-content-between">
          <CloudwatchWidget
            class="col-12 col-md-6 col-lg-4"
            :metrics="metricsNetworkOut"
            :live-data="false"
            stat="Average"
            :region="instance.region"
            :key="instance.InstanceId + 'networkOut'"
            :legend="{ position: 'hidden' }"
            graph-title="Network out"
            :label="instance.InstanceId"
            :y-axis="{ name: 'Bytes' }"
          />
          <CloudwatchWidget
            class="col-12 col-md-6 col-lg-4"
            :metrics="metricsNetworkPacketsIn"
            :live-data="false"
            stat="Average"
            :region="instance.region"
            :key="instance.InstanceId + 'networkPacketsIn'"
            :legend="{ position: 'hidden' }"
            graph-title="Network packets in"
            :label="instance.InstanceId"
          />
          <CloudwatchWidget
            class="col-12 col-md-6 col-lg-4"
            :metrics="metricsNetworkPacketsOut"
            :live-data="false"
            :region="instance.region"
            :key="instance.InstanceId + 'metricsNetworkPacketsOut'"
            :legend="{ position: 'hidden' }"
            graph-title="Network packets out"
            :label="instance.InstanceId"
          />
        </div>

        <div class="row justify-content-between">
          <CloudwatchWidget
            class="col-12 col-md-6 col-lg-4"
            :metrics="metricsStatusCheckFailedAny"
            :live-data="false"
            stat="Average"
            :region="instance.region"
            :key="instance.InstanceId + 'statusCheckFailedAny'"
            :legend="{ position: 'hidden' }"
            graph-title="Status check failed - any"
            :label="instance.InstanceId"
          />
          <CloudwatchWidget
            class="col-12 col-md-6 col-lg-4"
            :metrics="metricsStatusCheckFailedInstance"
            :live-data="false"
            stat="Average"
            :region="instance.region"
            :key="instance.InstanceId + 'statusCheckFailedInstance'"
            :legend="{ position: 'hidden' }"
            graph-title="Status check failed - instance"
            :label="instance.InstanceId"
          />
          <CloudwatchWidget
            class="col-12 col-md-6 col-lg-4"
            :metrics="metricsStatusCheckFailedSystem"
            :live-data="false"
            stat="Average"
            :region="instance.region"
            :key="instance.InstanceId + 'statusCheckFailedSystem'"
            :legend="{ position: 'hidden' }"
            graph-title="Status check failed - system"
            :label="instance.InstanceId"
          />
        </div>
      </gl-tab>
      <gl-tab title="Route tables">
        <RelatedRoutesTable
          :region="instance.region"
          filter-key="route.instance-id"
          :filter-value="instance.InstanceId"
        />
      </gl-tab>
    </gl-tabs>
  </div>
</template>

<script lang="ts">
import { GlBadge, GlTab, GlTable, GlTabs, GlCard } from "@gitlab/ui";
import { Component, Prop } from "vue-property-decorator";
import { instances } from "@/components/EC2/instances/instance";
import InstanceWithRegion = instances.InstanceWithRegion;
import RegionText from "@/components/common/RegionText.vue";
import { Metric } from "aws-sdk/clients/cloudwatch";
import CloudwatchWidget from "@/components/cloudwatch/CloudwatchWidget.vue";
import TagsTable from "@/components/common/TagsTable.vue";
import RelatedRoutesTable from "@/components/network/routeTables/RelatedRoutesTable.vue";
import { CardContent } from "@/components/common/cardContent";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import DrawerCards from "@/components/common/DrawerCards.vue";
import RelatedNetworkInterfaces from "@/components/network/networkInterfaces/RelatedNetworkInterfaces.vue";
import { isString } from "@/utils/isString";

@Component({
  components: {
    DrawerCards,
    RelatedRoutesTable,
    GlBadge,
    GlTabs,
    GlTab,
    GlTable,
    GlCard,
    RegionText,
    CloudwatchWidget,
    TagsTable,
    RelatedNetworkInterfaces,
  },
})
export default class Instance extends DaintreeComponent {
  @Prop(Object) readonly instance!: InstanceWithRegion;

  readonly storageFields = [
    {
      key: "DeviceName",
    },
    {
      key: "AttachTime",
      label: "Attach Time",
    },
    {
      key: "Delete",
      label: "Delete on termination?",
    },
    {
      key: "Status",
      label: "Status",
    },
    {
      key: "ID",
      label: "Volume ID",
    },
  ];

  get networkInterfacesId(): string[] {
    if (!this.instance.NetworkInterfaces) {
      return [];
    }

    return this.instance.NetworkInterfaces.map(
      (n) => n.NetworkInterfaceId
    ).filter(isString);
  }

  get overviewCards(): CardContent[] {
    return [
      {
        title: "Availability zone",
        value: this.instance.Placement?.AvailabilityZone,
        isAz: true,
        helpText: "The Availability Zone of the instance.",
      },
      {
        title: "VPC ID",
        linkTo: `/network/vpcs?vpcId=${this.instance.VpcId}`,
        value: this.instance.VpcId,
        helpText: "The ID of the VPC in which the instance is running.",
      },
      {
        title: "Subnet ID",
        linkTo: `/network/subnets?subnetId=${this.instance.SubnetId}`,
        value: this.instance.SubnetId,
        helpText: "The ID of the subnet in which the instance is running.",
      },
      {
        title: "Image-ID",
        value: this.instance.ImageId,
        helpText: "The ID of the AMI used to launch the instance.",
      },
      {
        title: "Launch time",
        value: this.instance.LaunchTime
          ? this.standardDate(this.instance.LaunchTime)
          : undefined,
        helpText: "The time the instance was launched.",
      },
      {
        title: "Key name",
        value: this.instance.KeyName,
        helpText:
          "The name of the key pair, if this instance was launched with an associated key pair.",
      },
    ];
  }

  get networkCards(): CardContent[] {
    return [
      {
        title: "Public IPv4",
        value: this.instance.PublicIpAddress,
        helpText: "The public IPv4 address assigned to the instance",
      },
      {
        title: "Public DNS Name",
        value: this.instance.PublicDnsName,
        helpText:
          "(IPv4 only) The public DNS name assigned to the instance. This name is not available until the instance enters the running state.",
      },
      {
        title: "Private IP",
        value: this.instance.PrivateIpAddress,
        helpText: "The private IPv4 address assigned to the instance.",
      },
      {
        title: "Private DNS Name",
        value: this.instance.PrivateDnsName,
        helpText:
          "The private DNS hostname name assigned to the instance. This DNS hostname can only be used inside the Amazon EC2 network. This name is not available until the instance enters the running state.",
      },
    ];
  }

  get storageCards(): CardContent[] {
    return [
      {
        title: "Root device type",
        value: this.instance.RootDeviceType,
        helpText:
          "The root device type used by the AMI. The AMI can use an EBS volume or an instance store volume.",
      },
      {
        title: "Root device name",
        value: this.instance.RootDeviceName,
        helpText:
          "The device name of the root device volume (for example, /dev/sda1).",
      },
      {
        title: "EBS optimized?",
        value: this.instance.EbsOptimized,
        helpText:
          "Indicates whether the instance is optimized for Amazon EBS I/O. This optimization provides dedicated throughput to Amazon EBS and an optimized configuration stack to provide optimal I/O performance. This optimization isn't available with all instance types. Additional usage charges apply when using an EBS Optimized instance.",
      },
      {
        title: "Virtualization type",
        value: this.instance.VirtualizationType,
        helpText: "The virtualization type of the instance.",
      },
    ];
  }

  get badgeVariant() {
    switch (this.instance.State?.Name) {
      case "pending":
        return "warning";
      case "running":
        return "success";
      case "shutting-down":
        return "warning";
      case "terminated":
        return "neutral";
      case "stopping":
        return "warning";
      case "stopped":
        return "danger";
      default:
        return "muted";
    }
  }

  get metricsCpuUtilization(): Metric[] {
    return [
      {
        Namespace: "AWS/EC2",
        MetricName: "CPUUtilization",
        Dimensions: [
          { Name: "InstanceId", Value: this.instance.InstanceId || "" },
        ],
      },
    ];
  }

  get metricsDiskReads(): Metric[] {
    return [
      {
        Namespace: "AWS/EC2",
        MetricName: "EBSReadBytes",
        Dimensions: [
          { Name: "InstanceId", Value: this.instance.InstanceId || "" },
        ],
      },
    ];
  }

  get metricsDiskReadOperations(): Metric[] {
    return [
      {
        Namespace: "AWS/EC2",
        MetricName: "EBSReadOps",
        Dimensions: [
          { Name: "InstanceId", Value: this.instance.InstanceId || "" },
        ],
      },
    ];
  }

  get metricsDiskWrites(): Metric[] {
    return [
      {
        Namespace: "AWS/EC2",
        MetricName: "EBSWriteBytes",
        Dimensions: [
          { Name: "InstanceId", Value: this.instance.InstanceId || "" },
        ],
      },
    ];
  }

  get metricsDiskWriteOperations(): Metric[] {
    return [
      {
        Namespace: "AWS/EC2",
        MetricName: "EBSWriteOps",
        Dimensions: [
          { Name: "InstanceId", Value: this.instance.InstanceId || "" },
        ],
      },
    ];
  }

  get metricsNetworkIn(): Metric[] {
    return [
      {
        Namespace: "AWS/EC2",
        MetricName: "NetworkIn",
        Dimensions: [
          { Name: "InstanceId", Value: this.instance.InstanceId || "" },
        ],
      },
    ];
  }

  get metricsNetworkOut(): Metric[] {
    return [
      {
        Namespace: "AWS/EC2",
        MetricName: "NetworkOut",
        Dimensions: [
          { Name: "InstanceId", Value: this.instance.InstanceId || "" },
        ],
      },
    ];
  }

  get metricsNetworkPacketsIn(): Metric[] {
    return [
      {
        Namespace: "AWS/EC2",
        MetricName: "NetworkPacketsIn",
        Dimensions: [
          { Name: "InstanceId", Value: this.instance.InstanceId || "" },
        ],
      },
    ];
  }

  get metricsNetworkPacketsOut(): Metric[] {
    return [
      {
        Namespace: "AWS/EC2",
        MetricName: "NetworkPacketsOut",
        Dimensions: [
          { Name: "InstanceId", Value: this.instance.InstanceId || "" },
        ],
      },
    ];
  }

  get metricsStatusCheckFailedAny(): Metric[] {
    return [
      {
        Namespace: "AWS/EC2",
        MetricName: "StatusCheckFailed",
        Dimensions: [
          { Name: "InstanceId", Value: this.instance.InstanceId || "" },
        ],
      },
    ];
  }

  get metricsStatusCheckFailedInstance(): Metric[] {
    return [
      {
        Namespace: "AWS/EC2",
        MetricName: "StatusCheckFailed_Instance",
        Dimensions: [
          { Name: "InstanceId", Value: this.instance.InstanceId || "" },
        ],
      },
    ];
  }

  get metricsStatusCheckFailedSystem(): Metric[] {
    return [
      {
        Namespace: "AWS/EC2",
        MetricName: "StatusCheckFailed_System",
        Dimensions: [
          { Name: "InstanceId", Value: this.instance.InstanceId || "" },
        ],
      },
    ];
  }
}
</script>
