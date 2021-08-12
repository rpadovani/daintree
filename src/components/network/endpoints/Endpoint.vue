<template>
  <gl-tabs theme="blue" lazy>
    <gl-tab title="Overview">
      <div class="row justify-content-between">
        <gl-alert :variant="alertVariant" :dismissible="false" class="col-9">
          Endpoint's state: <b>{{ endpoint.State }}</b>
        </gl-alert>

        <DeleteButtonWithConfirmation
          style="height: 100%"
          class="mt-2 col-2"
          resource-type="VPC endpoint"
          :resource-id="endpoint.VpcEndpointId"
          :resource-name="resourceName"
          @primary="deleteEndpoint"
          :disabled="endpoint.State !== 'available'"
        />
      </div>

      <DrawerCards :cards="cards" />

      <h5>Tags</h5>
      <TagsTable
        :tags="endpoint.Tags"
        :region="endpoint.region"
        :resource-id="endpoint.VpcEndpointId"
      />
    </gl-tab>

    <gl-tab title="Route Tables" v-if="endpoint.VpcEndpointType === 'Gateway'">
      <RelatedRoutesTable
        :region="endpoint.region"
        filter-key="route.gateway-id"
        :filter-value="endpoint.VpcEndpointId"
      />
    </gl-tab>

    <gl-tab title="Subnets" v-if="endpoint.VpcEndpointType === 'Interface'">
      <SubnetTab
        :region="endpoint.region"
        filter-name="subnet-id"
        :filter-values="endpoint.SubnetIds"
      />
    </gl-tab>

    <gl-tab
      title="Security groups"
      v-if="endpoint.VpcEndpointType === 'Interface'"
    >
      <RelatedSecurityGroups
        :region="endpoint.region"
        filter-name="group-id"
        :filter-values="securityGroupIds"
      />
    </gl-tab>

    <!--    <gl-tab-->
    <!--      title="Network interfaces"-->
    <!--      v-if="endpoint.VpcEndpointType === 'Interface'"-->
    <!--    >-->
    <!--      <RelatedRoutesTable-->
    <!--        :region="endpoint.region"-->
    <!--        filter-key="route.gateway-id"-->
    <!--        :filter-value="endpoint.VpcEndpointId"-->
    <!--      />-->
    <!--    </gl-tab>-->

    <gl-tab title="DNS entries" v-if="endpoint.VpcEndpointType === 'Interface'">
      <gl-table
        :items="endpoint.DnsEntries"
        borderless
        small
        hover
        thead-class="hidden-header"
        show-empty
        empty-text="Daintree hasn't found any related DNS entry!"
      />
    </gl-tab>

    <gl-tab title="Policy">
      <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
        When you create an endpoint, you can attach an endpoint policy to it
        that controls access to the service to which you are connecting.
        Endpoint policies must be written in JSON format. Not all services
        support endpoint policies. If you're using an endpoint to Amazon S3, you
        can also use Amazon S3 bucket policies to control access to buckets from
        specific endpoints, or specific VPCs.
        <a
          href="https://docs.aws.amazon.com/vpc/latest/userguide/vpc-endpoints-access.html#vpc-endpoint-policies"
          target="_blank"
          >More info on the AWS Guide<gl-icon name="external-link" />.</a
        >
      </gl-alert>
      <pre
        v-if="endpoint.PolicyDocument"
      ><code v-html="highlightedPolicy" /></pre>
      <gl-empty-state
        v-else
        class="mt-5"
        title="No policy found"
        svg-path="/assets/undraw_files1_9ool.svg"
        description="Daintree hasn't found any policy associated to this endpoint"
        compact
      />
    </gl-tab>
  </gl-tabs>
</template>

<script lang="ts">
import {
  GlAlert,
  GlButton,
  GlCard,
  GlEmptyState,
  GlSkeletonLoading,
  GlTab,
  GlTable,
  GlTabs,
  GlIcon,
} from "@gitlab/ui";
import EC2Client, { VpcEndpoint } from "aws-sdk/clients/ec2";
import { Component, Prop } from "vue-property-decorator";
import TagsTable from "@/components/common/TagsTable.vue";
import RelatedRoutesTable from "@/components/network/routeTables/RelatedRoutesTable.vue";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import DrawerCards from "@/components/common/DrawerCards.vue";
import { CardContent } from "@/components/common/cardContent";
import { AlertVariant } from "@/store/notifications/state";
import { Metadata } from "@/mixins/DaintreeListComponent";
import { isString } from "@/utils/isString";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import SubnetTab from "@/components/network/subnets/SubnetTab.vue";
import RelatedSecurityGroups from "@/components/network/securityGroups/RelatedSecurityGroups.vue";
import { extractNameFromEC2Tags } from "@/components/common/tags";
import DeleteButtonWithConfirmation from "@/components/common/DeleteButtonWithConfirmation.vue";
hljs.registerLanguage("json", json);

@Component({
  components: {
    RelatedSecurityGroups,
    SubnetTab,
    DrawerCards,
    RelatedRoutesTable,
    TagsTable,
    GlTabs,
    GlTab,
    GlTable,
    GlEmptyState,
    GlSkeletonLoading,
    GlCard,
    GlAlert,
    GlButton,
    GlIcon,
    DeleteButtonWithConfirmation,
  },
})
export default class Endpoint extends DaintreeComponent {
  @Prop(Object) readonly endpoint!: VpcEndpoint & Metadata;

  get cards(): CardContent[] {
    return [
      {
        title: "Service name",
        value: this.endpoint.ServiceName,
        helpText:
          "The name of the service to which the endpoint is associated.",
      },
      {
        title: "VPC endpoint type",
        value: this.endpoint.VpcEndpointType,
        helpText: "The type of endpoint. Can be interface, or gateway.",
      },
      {
        title: "VPC ID",
        value: this.endpoint.VpcId,
        linkTo: `/network/vpcs?vpcId=${this.endpoint.VpcId}`,
        helpText: "The ID of the VPC to which the endpoint is associated.",
      },
      {
        title: "Private DNS enabled?",
        value: this.endpoint.PrivateDnsEnabled,
        helpText:
          "Indicates whether the VPC is associated with a private hosted zone.",
      },
      {
        title: "Managed by requester?",
        value: this.endpoint.PrivateDnsEnabled,
        helpText:
          "Indicates whether the VPC endpoint is being managed by its service.",
      },
      {
        title: "Creation time",
        value: this.endpoint.CreationTimestamp,
        helpText: "The date and time that the VPC endpoint was created.",
      },
      {
        title: "Region",
        value: this.endpoint.region,
        isRegion: true,
      },
      { title: "Owner ID", value: this.endpoint.OwnerId },
      {
        title: "Last error",
        value: this.endpoint.LastError?.Message,
        helpText: "The last error that occurred for VPC endpoint.",
      },
    ];
  }

  get securityGroupIds(): string[] {
    if (!this.endpoint.Groups) {
      //If there are no groups, we return a placeholder so the tab does not load all the SGs of the account
      return ["daintree_placeholder"];
    }
    return this.endpoint.Groups?.map((group) => group.GroupId).filter(isString);
  }

  get resourceName(): string | undefined {
    return extractNameFromEC2Tags(this.endpoint.Tags);
  }

  get alertVariant(): AlertVariant {
    //toLowerCase: the typings from the library are broken :/
    switch (this.endpoint.State?.toLowerCase()) {
      case "pendingacceptance":
      case "pending":
        return "info";
      case "available":
        return "success";
      case "deleting":
        return "warning";
      case "deleted":
      case "rejected":
      case "failed":
      case "expired":
        return "danger";
    }

    return "info";
  }

  get highlightedPolicy(): string {
    if (!this.endpoint.PolicyDocument) {
      return "{}";
    }

    //Beautify the JSON
    const jsonObj = JSON.parse(this.endpoint.PolicyDocument);
    const jsonString = JSON.stringify(jsonObj, null, "\t");

    return hljs.highlight("json", jsonString).value;
  }

  async EC2Client(): Promise<EC2Client | void> {
    const credentials = await this.credentials();

    if (credentials === undefined) {
      return;
    }

    return new EC2Client({ region: this.endpoint.region, credentials });
  }

  async deleteEndpoint(): Promise<void> {
    if (!this.endpoint.VpcEndpointId) {
      return;
    }

    const client = await this.EC2Client();

    if (!client) {
      return;
    }

    try {
      await client
        .deleteVpcEndpoints({
          VpcEndpointIds: [this.endpoint.VpcEndpointId],
        })
        .promise();

      this.hideErrors("deleteEndpoint");
      this.$emit("deleted");
    } catch (err) {
      this.showError(err.message, "deleteEndpoint");
    }
  }
}
</script>
