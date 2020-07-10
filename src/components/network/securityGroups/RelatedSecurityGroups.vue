<template>
  <div>
    <gl-alert
      v-if="securityGroupsState === 'error'"
      variant="danger"
      :dismissible="false"
      >{{ securityGroupsError }}
    </gl-alert>

    <gl-table
      :items="securityGroups"
      :fields="securityGroupsFields"
      borderless
      small
      hover
      :busy="securityGroupsState === 'loading'"
      thead-class="hidden-header"
      show-empty
      empty-text="Daintree hasn't found any related security group!"
    >
      <template v-slot:cell(GroupId)="data">
        <gl-link :to="`/network/securityGroups?GroupId=${data.value}`">{{
          data.value
        }}</gl-link>
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
import EC2Client, { SecurityGroupList } from "aws-sdk/clients/ec2";
import { GlTable, GlSkeletonLoading, GlLink, GlAlert } from "@gitlab/ui";
import { Formatters } from "@/mixins/formatters";
import { mixins } from "vue-class-component";

@Component({
  components: {
    GlTable,
    GlSkeletonLoading,
    GlLink,
    GlAlert,
  },
})
export default class RelatedSecurityGroups extends mixins(
  DaintreeComponent,
  Formatters
) {
  @Prop(String) readonly region!: string;
  @Prop(String) readonly filterName!: string;
  @Prop(String) readonly filterValues!: string[];

  securityGroups: SecurityGroupList | undefined = [];
  securityGroupsState: "loading" | "loaded" | "empty" | "error" = "loading";
  securityGroupsError: string | undefined;
  securityGroupsFields = [
    { key: "GroupId", label: "Security Group Id", sortable: true },
    {
      key: "GroupName",
      label: "Name",
      sortable: true,
    },
    "OwnerId",
  ];

  async EC2Client(): Promise<EC2Client | void> {
    const credentials = await this.credentials();

    if (credentials === undefined) {
      return;
    }

    return new EC2Client({ region: this.region, credentials });
  }

  async describeSecurityGroups(): Promise<void> {
    const params = {
      Filters: [
        {
          Name: this.filterName,
          Values: this.filterValues,
        },
      ],
    };
    this.securityGroups = [];
    this.securityGroupsState = "loading";
    this.securityGroupsError = undefined;

    const EC2 = await this.EC2Client();

    if (!EC2) {
      return;
    }

    try {
      const data = await EC2.describeSecurityGroups(params).promise();
      this.securityGroups = data.SecurityGroups;
      this.securityGroupsError = undefined;
      this.securityGroupsState =
        this.securityGroups === undefined || this.securityGroups.length === 0
          ? "empty"
          : "loaded";
    } catch (err) {
      this.securityGroupsError = err.message;
      this.securityGroupsState = "error";
    }
  }

  @Watch("filterValues")
  onFilterChanged(): void {
    this.describeSecurityGroups();
  }

  mounted(): void {
    this.describeSecurityGroups();
  }
}
</script>
