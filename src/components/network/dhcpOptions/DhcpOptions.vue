<template>
  <div>
    <DeleteButtonWithConfirmation
      class="text-center"
      resource-type="DHCP options set"
      :resource-id="dhcpOptions.DhcpOptionsId"
      :resource-name="resourceName"
      @primary="deleteDhcpOptions"
    />

    <DrawerCards :cards="cards" />

    <h5 class="mt-5">Configurations</h5>
    <gl-table :items="dhcpOptions.DhcpConfigurations" stacked="sm">
      <template v-slot:cell(Values)="data">
        {{ data.value.map((x) => x.Value).join(",") }}
      </template>
    </gl-table>

    <h5>Tags</h5>
    <TagsTable
      :tags="dhcpOptions.Tags"
      :region="dhcpOptions.region"
      :resource-id="dhcpOptions.DhcpOptionsId"
    />
  </div>
</template>

<script lang="ts">
import { GlTable } from "@gitlab/ui";
import EC2Client, { DhcpOptions as AWSDhcpOptions } from "aws-sdk/clients/ec2";
import { Component, Prop } from "vue-property-decorator";
import TagsTable from "@/components/common/TagsTable.vue";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import DrawerCards from "@/components/common/DrawerCards.vue";
import { CardContent } from "@/components/common/cardContent";
import { Metadata } from "@/mixins/DaintreeListComponent";
import DeleteButtonWithConfirmation from "@/components/common/DeleteButtonWithConfirmation.vue";
import { extractNameFromEC2Tags } from "@/components/common/tags.ts";

@Component({
  components: {
    DeleteButtonWithConfirmation,
    DrawerCards,
    TagsTable,
    GlTable,
  },
})
export default class DhcpOptions extends DaintreeComponent {
  @Prop(Object) readonly dhcpOptions!: AWSDhcpOptions & Metadata;

  get cards(): CardContent[] {
    return [
      {
        title: "DHCP options sets ID",
        value: this.dhcpOptions.DhcpOptionsId,
        helpText: "The ID of the set of DHCP options.",
      },
      {
        title: "Owner ID",
        value: this.dhcpOptions.OwnerId,
        helpText: "The ID of the AWS account that owns the DHCP options set.",
      },
      {
        title: "Region",
        value: this.dhcpOptions.region,
        isRegion: true,
      },
    ];
  }

  get resourceName(): string | undefined {
    return extractNameFromEC2Tags(this.dhcpOptions.Tags);
  }

  async EC2Client(): Promise<EC2Client | void> {
    const credentials = await this.credentials();

    if (credentials === undefined) {
      return;
    }

    return new EC2Client({ region: this.dhcpOptions.region, credentials });
  }

  async deleteDhcpOptions(): Promise<void> {
    if (!this.dhcpOptions.DhcpOptionsId) {
      return;
    }

    const client = await this.EC2Client();

    if (!client) {
      return;
    }

    try {
      await client
        .deleteDhcpOptions({
          DhcpOptionsId: this.dhcpOptions.DhcpOptionsId,
        })
        .promise();

      this.hideErrors("deleteDhcpOptions");
      this.$emit("deleted");
    } catch (err) {
      this.showError(err.message, "deleteDhcpOptions");
    }
  }
}
</script>
