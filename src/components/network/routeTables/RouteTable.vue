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
        <gl-modal
          modal-id="delete-route-table-modal"
          title="Delete route table"
          no-fade
          :action-primary="deleteRouteTableButtonProps"
          :action-cancel="cancelProps"
          @primary="deleteRouteTable"
        >
          Are you sure that you want to delete this route table (<b>{{
            routeTable.RouteTableId
          }}</b
          >)?
        </gl-modal>
        <div class="row justify-content-center">
          <gl-button-group class="">
            <gl-button
              variant="success"
              category="secondary"
              :disabled="isMain"
              @click="setAsMain"
              >Set main route table
            </gl-button>
            <gl-button
              style="height: 100%;"
              variant="danger"
              category="secondary"
              v-gl-modal-directive="'delete-route-table-modal'"
              >Delete this route table</gl-button
            >
          </gl-button-group>
        </div>

        <DrawerCards :cards="cards" />

        <h5 class="mt-2">Tags</h5>
        <!--I use key to force a rerender, I should study Vue reactivity better ¯\_(ツ)_/¯ -->
        <TagsTable
          :key="routeTable.RouteTableId"
          :tags="routeTable.Tags"
          :region="routeTable.region"
          :resource-id="routeTable.RouteTableId"
        />
      </gl-tab>

      <gl-tab title="Routes">
        <ListOfRoutes :routes="routeTable.Routes" />
      </gl-tab>

      <gl-tab title="Subnets associations">
        <SubnetTab
          :region="routeTable.region"
          filter-name="subnet-id"
          :filter-values="associatedSubnetsIds"
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
  GlButtonGroup,
} from "@gitlab/ui";
import EC2Client from "aws-sdk/clients/ec2";
import { Component, Prop } from "vue-property-decorator";
import { Formatters } from "@/mixins/formatters";
import TagsTable from "@/components/common/TagsTable.vue";
import { mixins } from "vue-class-component";
import Notifications from "@/mixins/notifications";
import FlowLogsTab from "@/components/network/flowLogs/FlowLogsTab.vue";
import { routeTables } from "@/components/network/routeTables/routeTable";
import RouteTableWithRegion = routeTables.RouteTableWithRegion;
import SubnetTab from "@/components/network/subnets/SubnetTab.vue";
import { isString } from "@/utils/isString";
import ListOfRoutes from "@/components/network/routeTables/ListOfRoutes.vue";
import DrawerCards from "@/components/common/DrawerCards.vue";
import { CardContent } from "@/components/common/cardContent";

@Component({
  components: {
    ListOfRoutes,
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
    SubnetTab,
    DrawerCards,
  },
  directives: { "gl-modal-directive": GlModalDirective },
})
export default class RouteTable extends mixins(Formatters, Notifications) {
  @Prop(Object) readonly routeTable!: RouteTableWithRegion;
  @Prop(String) readonly mainRouteAssociationId: string | undefined;

  alertVariant = "";
  alertMessage = "";

  deleteRouteTableButtonProps = {
    text: "Delete route table",
    attributes: [{ variant: "danger" }],
  };

  cancelProps = {
    text: "Cancel",
  };

  get cards(): CardContent[] {
    return [
      {
        title: "VPC ID",
        value: this.routeTable.VpcId,
        linkTo: `/network/vpcs?vpcId=${this.routeTable.VpcId}`,
        helpText: "The ID of the VPC for the route table.",
      },
      {
        title: "Main",
        value: this.isMain,
        helpText: "Is the main route table for the VPC?",
      },
      {
        title: "Owner ID",
        value: this.routeTable.OwnerId,
        helpText: "The ID of the AWS account that owns the route table.",
      },
    ];
  }

  get EC2() {
    return new EC2Client({
      region: this.routeTable.region,
      credentials: this.$store.getters["sts/credentials"],
    });
  }

  get isMain(): boolean {
    if (!this.routeTable || !this.routeTable.Associations) {
      return false;
    }
    return this.routeTable.Associations.filter((a) => a.Main).length > 0;
  }

  get associatedSubnetsIds(): string[] {
    if (!this.routeTable || !this.routeTable.Associations) {
      return [];
    }

    return this.routeTable.Associations.map((a) => a.SubnetId).filter(isString);
  }

  setAsMain() {
    if (!this.mainRouteAssociationId || !this.routeTable.RouteTableId) {
      this.alertMessage = "We weren't able to perform the operation";
      this.alertVariant = "danger";
      return;
    }

    this.EC2.replaceRouteTableAssociation(
      {
        AssociationId: this.mainRouteAssociationId,
        RouteTableId: this.routeTable.RouteTableId,
      },
      (err) => {
        if (err) {
          this.alertMessage = err.message;
          this.alertVariant = "danger";
        } else {
          this.alertMessage = "Operation performed successfully";
          this.alertVariant = "success";
          this.$emit("setmain");
        }
      }
    );
  }

  deleteRouteTable() {
    if (!this.routeTable.RouteTableId) {
      return;
    }

    this.EC2.deleteRouteTable(
      { RouteTableId: this.routeTable.RouteTableId },
      (err) => {
        if (err) {
          this.showError(err.message, "deleteRouteTable");
        } else {
          this.hideErrors("deleteRouteTable");
          this.showAlert({
            variant: "info",
            text: "Deleted route table with ID " + this.routeTable.RouteTableId,
            key: "deletingRouteTable",
            resourceId: this.routeTable.RouteTableId,
          });
          this.$emit("deleted");
        }
      }
    );
  }
}
</script>

<style scoped></style>
