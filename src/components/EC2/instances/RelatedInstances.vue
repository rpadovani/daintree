<template>
  <div>
    <gl-alert
      v-if="instancesState === 'error'"
      variant="danger"
      :dismissible="false"
      >{{ instancesError }}
    </gl-alert>
    <gl-table
      :fields="instancesFields"
      :items="instances"
      borderless
      small
      hover
      :busy="instancesState === 'loading'"
      thead-class="hidden-header"
      show-empty
      empty-text="Daintree hasn't found any related instance!"
    >
      <template v-slot:cell(state)="data">
        <StateText :state="data.value" />
      </template>
      <template v-slot:cell(InstanceId)="data">
        <gl-link :to="`/ec2/instances?instanceId=${data.value}`">
          {{ data.value }}
        </gl-link>
      </template>
      <template v-slot:table-busy>
        <gl-skeleton-loading />
      </template>
    </gl-table>
  </div>
</template>
<script lang="ts">
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import { Component, Prop, Watch } from "vue-property-decorator";
import EC2Client, {
  DescribeInstancesRequest,
  Instance,
  InstanceState,
  TagList,
} from "aws-sdk/clients/ec2";
import { GlTable, GlSkeletonLoading, GlLink, GlAlert } from "@gitlab/ui";
import StateText from "@/components/common/StateText.vue";
import { extractNameFromEC2Tags } from "@/components/common/tags.ts";

@Component({
  components: {
    GlTable,
    GlSkeletonLoading,
    GlLink,
    GlAlert,
    StateText,
  },
})
export default class RelatedInstances extends DaintreeComponent {
  @Prop(String) readonly region!: string;
  @Prop(String) readonly filterKey!: string;
  @Prop(String) readonly filterValue!: string;

  instances: Instance[] = [];
  instancesState: "loading" | "loaded" | "empty" | "error" = "loading";
  instancesError: string | undefined;
  instancesFields = [
    {
      key: "Tags",
      label: "Name",
      sortable: true,
      formatter: extractNameFromEC2Tags,
    },
    {
      key: "InstanceId",
      sortable: true,
    },
    {
      key: "InstanceType",
      sortable: true,
    },
    { key: "State", formatter: (s: InstanceState): string => s.Name || "" },
  ];

  async EC2Client(): Promise<EC2Client | void> {
    const credentials = await this.credentials();

    if (credentials === undefined) {
      return;
    }

    return new EC2Client({ region: this.region, credentials });
  }

  async describeInstances(): Promise<void> {
    const params: DescribeInstancesRequest = {
      Filters: [
        {
          Name: this.filterKey,
          Values: [this.filterValue],
        },
      ],
    };
    this.instancesState = "loading";
    this.instances = [];
    this.instancesError = "";

    const EC2 = await this.EC2Client();

    if (!EC2) {
      return;
    }

    try {
      const data = await EC2.describeInstances(params).promise();
      data.Reservations?.forEach((r) => {
        if (r.Instances) {
          this.instances = this.instances.concat(r.Instances);
        }
      });

      this.instancesError = undefined;
      this.instancesState = this.instances.length === 0 ? "empty" : "loaded";
    } catch (err) {
      this.instancesError = err.message;
      this.instancesState = "error";
    }
  }

  extractNameFromTags(tags: TagList): string | undefined {
    const nameTag = tags.filter((v) => v.Key === "Name");

    if (nameTag.length > 0) {
      return nameTag[0].Value;
    }

    return "";
  }

  @Watch("filterValue")
  onFilterChanged(): void {
    this.describeInstances();
  }

  mounted(): void {
    this.describeInstances();
  }
}
</script>
