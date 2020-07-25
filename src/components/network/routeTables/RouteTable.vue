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
            updatedRouteTable.RouteTableId
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
        <TagsTable
          :tags="updatedRouteTable.Tags"
          :region="updatedRouteTable.region"
          :resource-id="updatedRouteTable.RouteTableId"
        />
      </gl-tab>

      <gl-tab title="Routes">
        <ListOfRoutes :routes="updatedRouteTable.Routes" />
      </gl-tab>

      <gl-tab title="Subnets associations">
        <SubnetTab
          :region="updatedRouteTable.region"
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
import { Component, Prop, Watch } from "vue-property-decorator";
import TagsTable from "@/components/common/TagsTable.vue";
import FlowLogsTab from "@/components/network/flowLogs/FlowLogsTab.vue";
import { routeTables } from "@/components/network/routeTables/routeTable";
import RouteTableWithRegion = routeTables.RouteTableWithRegion;
import SubnetTab from "@/components/network/subnets/SubnetTab.vue";
import { isString } from "@/utils/isString";
import ListOfRoutes from "@/components/network/routeTables/ListOfRoutes.vue";
import DrawerCards from "@/components/common/DrawerCards.vue";
import { CardContent } from "@/components/common/cardContent";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";

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
export default class RouteTable extends DaintreeComponent {
  @Prop(Object) readonly routeTable!: RouteTableWithRegion;
  @Prop(String) readonly mainRouteAssociationId: string | undefined;

  private freshRouteTable: RouteTableWithRegion = {};

  alertVariant = "";
  alertMessage = "";

  deleteRouteTableButtonProps = {
    text: "Delete route table",
    attributes: [{ variant: "danger" }],
  };

  cancelProps = {
    text: "Cancel",
  };

  get updatedRouteTable(): RouteTableWithRegion {
    if (this.routeTable.RouteTableId !== this.freshRouteTable.RouteTableId) {
      return this.routeTable;
    }

    return this.freshRouteTable;
  }

  get cards(): CardContent[] {
    return [
      {
        title: "VPC ID",
        value: this.updatedRouteTable.VpcId,
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
        value: this.updatedRouteTable.OwnerId,
        helpText: "The ID of the AWS account that owns the route table.",
      },
    ];
  }

  async EC2(): Promise<EC2Client | undefined> {
    const credentials = await this.credentials();
    if (!credentials) {
      return;
    }

    return new EC2Client({
      region: this.updatedRouteTable.region,
      credentials,
    });
  }

  get isMain(): boolean {
    if (!this.updatedRouteTable || !this.updatedRouteTable.Associations) {
      return false;
    }
    return this.updatedRouteTable.Associations.filter((a) => a.Main).length > 0;
  }

  get associatedSubnetsIds(): string[] {
    if (!this.routeTable || !this.routeTable.Associations) {
      return [];
    }

    return this.routeTable.Associations.map((a) => a.SubnetId).filter(isString);
  }

  async setAsMain(): Promise<void> {
    if (!this.mainRouteAssociationId || !this.routeTable.RouteTableId) {
      this.alertMessage = "We weren't able to perform the operation";
      this.alertVariant = "danger";
      return;
    }

    const client = await this.EC2();
    if (!client) {
      return;
    }

    try {
      await client
        .replaceRouteTableAssociation({
          AssociationId: this.mainRouteAssociationId,
          RouteTableId: this.routeTable.RouteTableId,
        })
        .promise();
      this.alertMessage = "Operation performed successfully";
      this.alertVariant = "success";
      this.$emit("setmain", this.routeTable.RouteTableId);
      await this.downloadRouteTable();
    } catch (err) {
      this.alertMessage = err.message;
      this.alertVariant = "danger";
    }
  }

  async deleteRouteTable(): Promise<void> {
    if (!this.routeTable.RouteTableId) {
      return;
    }

    const client = await this.EC2();
    if (!client) {
      return;
    }

    try {
      await client
        .deleteRouteTable({ RouteTableId: this.routeTable.RouteTableId })
        .promise();

      this.showAlert({
        variant: "info",
        text: "Deleted route table with ID " + this.routeTable.RouteTableId,
        key: "deletingRouteTable",
        resourceId: this.routeTable.RouteTableId,
      });
      this.$emit("deleted");
    } catch (err) {
      this.alertMessage = err;
      this.alertVariant = "danger";
    }
  }

  @Watch("routeTable", { immediate: true, deep: true })
  async downloadRouteTable(): Promise<void> {
    const client = await this.EC2();

    if (!client || !this.routeTable.RouteTableId) {
      return;
    }

    try {
      const data = await client
        .describeRouteTables({
          Filters: [
            {
              Name: "route-table-id",
              Values: [this.routeTable.RouteTableId],
            },
          ],
        })
        .promise();

      if (!data.RouteTables) {
        return;
      }

      this.freshRouteTable = {
        ...data.RouteTables[0],
        region: this.routeTable.region,
      };
    } catch (err) {
      this.alertMessage = err.message;
      this.alertVariant = "danger";
    }
  }
}
</script>
