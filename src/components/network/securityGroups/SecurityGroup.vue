<template>
  <div>
    <gl-alert
      :variant="alertVariant"
      v-if="alertMessage !== ''"
      @dismiss="() => (alertMessage = '')"
    >
      {{ alertMessage }}
    </gl-alert>
    <gl-tabs theme="blue" lazy>
      <gl-tab title="Overview">
        <DeleteButtonWithConfirmation
          class="text-center"
          resource-type="security group"
          :resource-id="securityGroup.GroupId"
          :resource-name="resourceName"
          @primary="deleteSecurityGroup"
        />

        <DrawerCards :cards="cards" />

        <h5 class="mt-2">Tags</h5>
        <TagsTable
          :tags="securityGroup.Tags"
          :region="securityGroup.region"
          :resource-id="securityGroup.GroupId"
        />
      </gl-tab>

      <gl-tab title="Inbound rules">
        <ListOfRules
          :rules="securityGroup.IpPermissions"
          :key="securityGroup.GroupId"
        />
      </gl-tab>

      <gl-tab title="Outbound rules">
        <ListOfRules
          :rules="securityGroup.IpPermissionsEgress"
          :key="securityGroup.GroupId"
          is-outbound
        />
      </gl-tab>

      <gl-tab title="EC2 Instances">
        <gl-alert variant="tip" :dismissible="false">
          A list of EC2 instances that are using this security group.
        </gl-alert>

        <RelatedInstances
          :region="securityGroup.region"
          filter-key="instance.group-id"
          :filter-value="securityGroup.GroupId"
        />
      </gl-tab>

      <gl-tab title="Network interfaces">
        <gl-alert variant="tip" :dismissible="false">
          List of network interfaces associated to this security group.
        </gl-alert>

        <RelatedNetworkInterfaces
          :region="securityGroup.region"
          filter-name="group-id"
          :filter-values="[securityGroup.GroupId]"
        />
      </gl-tab>
    </gl-tabs>
  </div>
</template>

<script lang="ts">
import { GlTab, GlTabs, GlAlert } from "@gitlab/ui";
import EC2Client from "aws-sdk/clients/ec2";
import { Component, Prop } from "vue-property-decorator";
import TagsTable from "@/components/common/TagsTable.vue";
import FlowLogsTab from "@/components/network/flowLogs/FlowLogsTab.vue";
import { securityGroups } from "@/components/network/securityGroups/securityGroup";
import SecurityGroupWithRegion = securityGroups.SecurityGroupWithRegion;
import SubnetTab from "@/components/network/subnets/SubnetTab.vue";
import ListOfRules from "@/components/network/securityGroups/ListOfRules.vue";
import RelatedInstances from "@/components/EC2/instances/RelatedInstances.vue";
import { CardContent } from "@/components/common/cardContent";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import DrawerCards from "@/components/common/DrawerCards.vue";
import RelatedNetworkInterfaces from "@/components/network/networkInterfaces/RelatedNetworkInterfaces.vue";
import DeleteButtonWithConfirmation from "@/components/common/DeleteButtonWithConfirmation.vue";
import { extractNameFromEC2Tags } from "@/components/common/tags";

@Component({
  components: {
    RelatedInstances,
    ListOfRules,
    TagsTable,
    GlTabs,
    GlTab,
    GlAlert,
    FlowLogsTab,
    SubnetTab,
    DrawerCards,
    RelatedNetworkInterfaces,
    DeleteButtonWithConfirmation,
  },
})
export default class SecurityGroup extends DaintreeComponent {
  @Prop(Object) readonly securityGroup!: SecurityGroupWithRegion;
  @Prop(String) readonly mainRouteAssociationId: string | undefined;

  alertVariant = "";
  alertMessage = "";

  get resourceName(): string | undefined {
    return extractNameFromEC2Tags(this.securityGroup.Tags);
  }

  get cards(): CardContent[] {
    return [
      {
        title: "VPC ID",
        value: this.securityGroup.VpcId,
        linkTo: `/network/vpcs?vpcId=${this.securityGroup.VpcId}`,
        helpText: "The ID of the VPC for the security group.",
      },
      {
        title: "Description",
        value: this.securityGroup.Description,
        helpText: "A description of the security group.",
      },
      {
        title: "Owner ID",
        value: this.securityGroup.OwnerId,
        helpText: "The AWS account ID of the owner of the security group.",
      },
    ];
  }

  get EC2() {
    return new EC2Client({
      region: this.securityGroup.region,
      credentials: this.$store.getters["sts/credentials"],
    });
  }

  deleteSecurityGroup() {
    if (!this.securityGroup.GroupId) {
      return;
    }

    this.EC2.deleteSecurityGroup(
      { GroupId: this.securityGroup.GroupId },
      (err) => {
        if (err) {
          this.showError(err.message, "deleteSecurityGroup");
        } else {
          this.hideErrors("deleteSecurityGroup");
          this.showAlert({
            variant: "info",
            text:
              "Deleted security group with ID " + this.securityGroup.GroupId,
            key: "deletingSecurityGroup",
            resourceId: this.securityGroup.GroupId,
          });
          this.$emit("deleted");
        }
      }
    );
  }
}
</script>
