<template>
  <div>
    <gl-alert
      :variant="alertVariant"
      v-if="alertMessage !== ''"
      @dismiss="() => (alertMessage = '')"
    >
      {{ alertMessage }}
    </gl-alert>
    <gl-tabs theme="blue">
      <gl-tab title="Overview">
        <gl-modal
          modal-id="delete-security-group-modal"
          title="Delete security group"
          no-fade
          :action-primary="deleteSecurityGroupButtonProps"
          :action-cancel="cancelProps"
          @primary="deleteSecurityGroup"
        >
          Are you sure that you want to delete this security group (<b>{{
            securityGroup.GroupId
          }}</b
          >)?
        </gl-modal>

        <div class="row justify-content-around mt-2">
          <gl-card class="col-3" title="VPC Id">
            <router-link :to="`/network/vpcs?vpcId=${securityGroup.VpcId}`">
              {{ securityGroup.VpcId }}
            </router-link>
          </gl-card>

          <gl-card class="col-3" title="Description">
            {{ securityGroup.Description }}
          </gl-card>
          <gl-card class="col-3" title="Owner ID">
            {{ securityGroup.OwnerId }}
          </gl-card>
        </div>

        <h5 class="mt-2">Tags</h5>
        <!--I use key to force a rerender, I should study Vue reactivity better ¯\_(ツ)_/¯ -->
        <TagsTable
          :key="securityGroup.GroupId"
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
    </gl-tabs>
  </div>
</template>

<script lang="ts">
import {
  GlEmptyState,
  GlSkeletonLoading,
  GlTab,
  GlTable,
  GlTabs,
  GlCard,
  GlAlert,
  GlButton,
  GlModal,
  GlModalDirective,
  GlButtonGroup
} from "@gitlab/ui";
import AWS from "aws-sdk";
import { Component, Prop } from "vue-property-decorator";
import { Formatters } from "@/mixins/formatters";
import TagsTable from "@/components/common/TagsTable.vue";
import { mixins } from "vue-class-component";
import Notifications from "@/mixins/notifications";
import FlowLogsTab from "@/components/network/flowLogs/FlowLogsTab.vue";
import { securityGroups } from "@/components/network/securityGroups/securityGroup";
import SecurityGroupWithRegion = securityGroups.SecurityGroupWithRegion;
import SubnetTab from "@/components/network/subnets/SubnetTab.vue";
import ListOfRules from "@/components/network/securityGroups/ListOfRules.vue";

@Component({
  components: {
    ListOfRules,
    TagsTable,
    GlTabs,
    GlTab,
    GlTable,
    GlEmptyState,
    GlSkeletonLoading,
    GlCard,
    GlAlert,
    GlButton,
    GlModal,
    FlowLogsTab,
    GlButtonGroup,
    SubnetTab
  },
  directives: { "gl-modal-directive": GlModalDirective }
})
export default class SecurityGroup extends mixins(Formatters, Notifications) {
  @Prop(Object) readonly securityGroup!: SecurityGroupWithRegion;
  @Prop(String) readonly mainRouteAssociationId: string | undefined;

  alertVariant = "";
  alertMessage = "";

  deleteSecurityGroupButtonProps = {
    text: "Delete security group",
    attributes: [{ variant: "danger" }]
  };

  cancelProps = {
    text: "Cancel"
  };

  get EC2() {
    return new AWS.EC2({ region: this.securityGroup.region });
  }

  deleteSecurityGroup() {
    if (!this.securityGroup.GroupId) {
      return;
    }

    const EC2 = new AWS.EC2({ region: this.securityGroup.region });
    EC2.deleteSecurityGroup({ GroupId: this.securityGroup.GroupId }, err => {
      if (err) {
        this.showError(err.message, "deleteSecurityGroup");
      } else {
        this.hideErrors("deleteSecurityGroup");
        this.showAlert({
          variant: "info",
          text: "Deleted security group with ID " + this.securityGroup.GroupId,
          key: "deletingSecurityGroup",
          resourceId: this.securityGroup.GroupId
        });
        this.$emit("deleted");
      }
    });
  }
}
</script>

<style scoped></style>
