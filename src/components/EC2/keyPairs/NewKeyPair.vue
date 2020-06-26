<template>
  <div>
    <div class="container mt-2" v-if="!keyCreated">
      <h2>Create a new key pair</h2>
      <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
        A key pair, consisting of a private key and a public key, is a set of
        security credentials that you use to prove your identity when connecting
        to an EC2 instance.
      </gl-alert>
      <gl-form-group
        id="region-id"
        label="Region"
        label-size="sm"
        description="To see other regions, enable them in the settings"
        label-for="region-input"
      >
        <gl-form-select
          id="region-input"
          v-model="selectedRegion"
          :options="regionsEnabled"
        />
      </gl-form-group>

      <gl-form-input-group
        class="mt-3"
        v-model="keyPairName"
        placeholder="Enter key pair name"
      >
        <template #prepend>
          <b-input-group-text>Name</b-input-group-text>
        </template>
      </gl-form-input-group>

      <div class="row justify-content-between mt-3">
        <gl-button category="secondary" variant="danger" to="/ec2/keyPairs">
          Cancel
        </gl-button>
        <gl-button
          class="float-right"
          category="primary"
          variant="success"
          @click="createKeyPair"
          :disabled="selectedRegion === '' || keyPairName === ''"
          >Create new key pair
        </gl-button>
      </div>
    </div>

    <div class="container mt-2" v-if="keyCreated">
      <h3>Your new private key</h3>
      <gl-alert variant="warning" class="mb-2 mt-2" :dismissible="false">
        Download and store safely this private key now, because you will not be
        able to access it again.
        <template #actions>
          <gl-button
            variant="warning"
            :download="`${keyPairName}.pem`"
            :href="linkToDownloadKey"
            >Download key</gl-button
          >
          <gl-button
            class="ml-2"
            variant="info"
            category="secondary"
            to="/ec2/keyPairs"
          >
            Go back to key pairs list
          </gl-button>
        </template>
      </gl-alert>
      <div class="row">
        <code
          class="gl-font-monospace col-12 col-md-11 col-lg-9"
          style="word-break: break-all;"
        >
          {{ keyMaterial }}
        </code>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {
  GlAlert,
  GlFormGroup,
  GlFormInputGroup,
  GlFormSelect,
  GlButton,
} from "@gitlab/ui";
import { BInputGroupText } from "bootstrap-vue";
import EC2Client from "aws-sdk/clients/ec2";
import { Component } from "vue-property-decorator";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";

@Component({
  components: {
    GlFormSelect,
    GlFormGroup,
    GlAlert,
    GlFormInputGroup,
    BInputGroupText,
    GlButton,
  },
})
export default class NewKeyPair extends DaintreeComponent {
  selectedRegion = "";
  keyPairName = "";
  keyCreated = false;
  keyMaterial = "";
  keyFingerprint = "";

  get linkToDownloadKey() {
    return URL.createObjectURL(new Blob([this.keyMaterial]));
  }

  async createKeyPair() {
    const credentials = await this.credentials();

    if (credentials === undefined) {
      return;
    }

    const EC2 = new EC2Client({ region: this.selectedRegion, credentials });
    try {
      this.hideErrors("createKeyPair");

      const data = await EC2.createKeyPair({
        KeyName: this.keyPairName,
      }).promise();
      this.keyMaterial = data.KeyMaterial || "";
      this.keyFingerprint = data.KeyFingerprint || "";
      this.keyCreated = true;
      this.$toast.show("New key pair created", {
        position: "bottom-left",
        type: "success",
      });
    } catch (err) {
      this.showError(err.message, "createKeyPair");
    }
  }
}
</script>
