<template>
  <div>
    <DeleteButtonWithConfirmation
      class="text-center"
      resource-type="key pair"
      :resource-id="keyPair.KeyPairId"
      :resource-name="keyPair.KeyName"
      @primary="deleteKeyPair"
    />

    <DrawerCards :cards="cards" />

    <h5 class="mt-3">Related EC2 instances</h5>

    <RelatedInstances
      :region="keyPair.region"
      :filter-value="keyPair.KeyName"
      filter-key="key-name"
    />

    <h5 class="mt-3">Tags</h5>
    <TagsTable
      :tags="keyPair.Tags"
      :region="keyPair.region"
      :resource-id="keyPair.KeyPairId"
    />
  </div>
</template>

<script lang="ts">
import EC2Client from "aws-sdk/clients/ec2";
import { Component, Prop } from "vue-property-decorator";
import TagsTable from "@/components/common/TagsTable.vue";
import { keyPairs } from "@/components/EC2/keyPairs/keyPair";
import KeyPairWithRegion = keyPairs.KeyPairWithRegion;
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import RelatedInstances from "@/components/EC2/instances/RelatedInstances.vue";
import { CardContent } from "@/components/common/cardContent";
import DrawerCards from "@/components/common/DrawerCards.vue";
import DeleteButtonWithConfirmation from "@/components/common/DeleteButtonWithConfirmation.vue";

@Component({
  components: {
    RelatedInstances,
    TagsTable,
    DrawerCards,
    DeleteButtonWithConfirmation,
  },
})
export default class KeyPair extends DaintreeComponent {
  @Prop(Object) readonly keyPair!: KeyPairWithRegion;

  get cards(): CardContent[] {
    return [
      {
        title: "Key name",
        value: this.keyPair.KeyName,
        helpText: "The name of the key pair.",
      },
      {
        title: "Key fingerprint",
        value: this.keyPair.KeyFingerprint,
        isCode: true,
        helpText: "The SHA-1 digest of the DER encoded private key.",
      },
      {
        title: "Key ID",
        value: this.keyPair.KeyPairId,
        helpText: "The ID of the key pair.",
      },
    ];
  }

  async EC2Client() {
    const credentials = await this.credentials();

    if (credentials === undefined) {
      return;
    }

    return new EC2Client({ region: this.keyPair.region, credentials });
  }

  async deleteKeyPair() {
    if (!this.keyPair.KeyPairId) {
      return;
    }

    const EC2 = await this.EC2Client();

    if (!EC2) {
      return;
    }

    try {
      this.hideErrors("deleteKeyPair");
      await EC2.deleteKeyPair({ KeyPairId: this.keyPair.KeyPairId }).promise();

      this.showAlert({
        variant: "info",
        text: "Deleted key pair " + this.keyPair.KeyName,
        key: "deletingKeyPair",
        resourceId: this.keyPair.KeyPairId,
      });
      this.$emit("deleted");
    } catch (err) {
      this.showError(err.message, "deleteKeyPair");
    }
  }
}
</script>
