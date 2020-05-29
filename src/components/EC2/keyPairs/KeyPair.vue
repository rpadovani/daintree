<template>
  <div>
    <gl-modal
      modal-id="delete-key-pair-modal"
      :title="`Delete ${keyPair.KeyName}`"
      no-fade
      :action-primary="deleteKeyPairButtonProps"
      :action-cancel="cancelProps"
      @primary="deleteKeyPair"
    >
      Are you sure that you want to delete this key pair ({{
        keyPair.KeyName
      }})?
    </gl-modal>
    <div class="row justify-content-center">
      <gl-button
        style="height: 100%;"
        class="mt-2 col-2"
        variant="danger"
        category="secondary"
        v-gl-modal-directive="'delete-key-pair-modal'"
        >Delete this key pair
      </gl-button>
    </div>

    <div class="row justify-content-around mt-2">
      <gl-card class="col-12 col-sm-5 col-md-3 mb-1 mb-sm-0" title="Key name">
        {{ keyPair.KeyName }}
      </gl-card>
      <gl-card
        class="col-12 col-sm-5 col-md-3 mb-1 mb-sm-0"
        title="Key fingerprint"
      >
        {{ keyPair.KeyFingerprint }}
      </gl-card>

      <gl-card class="col-12 col-sm-5 col-md-3 mb-1 mb-sm-0" title="Key ID">
        {{ keyPair.KeyPairId }}
      </gl-card>
    </div>

    <h5 class="mt-3">Related EC2 instances</h5>

    <RelatedInstances
      :region="keyPair.region"
      :filter-value="keyPair.KeyName"
      filter-key="key-name"
    />

    <h5 class="mt-3">Tags</h5>
    <!--I use key to force a rerender, I should study Vue reactivity better ¯\_(ツ)_/¯ -->
    <TagsTable
      :key="keyPair.KeyPairId"
      :tags="keyPair.Tags"
      :region="keyPair.region"
      :resource-id="keyPair.KeyPairId"
    />
  </div>
</template>

<script lang="ts">
import {
  GlEmptyState,
  GlSkeletonLoading,
  GlTable,
  GlCard,
  GlAlert,
  GlButton,
  GlModal,
  GlModalDirective,
} from "@gitlab/ui";
import EC2Client from "aws-sdk/clients/ec2";
import { Component, Prop } from "vue-property-decorator";
import TagsTable from "@/components/common/TagsTable.vue";
import FlowLogsTab from "@/components/network/flowLogs/FlowLogsTab.vue";
import SubnetTab from "@/components/network/subnets/SubnetTab.vue";
import { keyPairs } from "@/components/EC2/keyPairs/keyPair";
import KeyPairWithRegion = keyPairs.KeyPairWithRegion;
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import StateText from "@/components/common/StateText.vue";
import RelatedInstances from "@/components/EC2/instances/RelatedInstances.vue";

@Component({
  components: {
    RelatedInstances,
    TagsTable,
    GlTable,
    GlEmptyState,
    GlSkeletonLoading,
    GlCard,
    GlAlert,
    GlButton,
    GlModal,
    FlowLogsTab,
    SubnetTab,
    StateText,
  },
  directives: { "gl-modal-directive": GlModalDirective },
})
export default class KeyPair extends DaintreeComponent {
  @Prop(Object) readonly keyPair!: KeyPairWithRegion;

  deleteKeyPairButtonProps = {
    text: "Delete key pair",
    attributes: {
      variant: "danger",
    },
  };

  cancelProps = {
    text: "Cancel",
  };

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

<style scoped>
.hidden-header {
  display: none;
}
</style>
