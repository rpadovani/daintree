<template>
  <div>
    <Header hide-refresher />
    <div class="container mt-2">
      <h2>Create a new queue</h2>
      <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
        A communication channel to send messages and subscribe to notifications.
        It provides an access point for publishers and subscribers to
        communicate with each other.
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
          :options="this.$store.getters['sts/regions']"
        />
      </gl-form-group>
      <gl-form-input-group
        class="mt-3"
        v-model="snsName"
        placeholder="Insert the name of your new topic"
      >
        <template #prepend>
          <b-input-group-text>Name</b-input-group-text>
        </template>
      </gl-form-input-group>

      <div class="row justify-content-between mt-3">
        <gl-button category="secondary" variant="danger" to="/messages/sns">
          Cancel
        </gl-button>
        <gl-button
          class="float-right"
          category="primary"
          variant="success"
          @click="createSns"
          >Create SNS
        </gl-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Header from "@/components/Header/Header.vue";
import {
  GlAlert,
  GlFormGroup,
  GlFormInputGroup,
  GlFormSelect,
  GlButton,
} from "@gitlab/ui";
import { BInputGroupText } from "bootstrap-vue";
import SNSClient from "aws-sdk/clients/sns";
import { Component } from "vue-property-decorator";
import Notifications from "@/mixins/notifications";
import { CreateTopicInput } from "aws-sdk/clients/sns";

@Component({
  components: {
    Header,
    GlFormSelect,
    GlFormGroup,
    GlAlert,
    GlFormInputGroup,
    BInputGroupText,
    GlButton,
  },
})
export default class NewSNS extends Notifications {
  selectedRegion = "";
  cidrBlock = "";
  snsName = "";

  createSns() {
    const SNS = new SNSClient({
      region: this.selectedRegion,
      credentials: this.$store.getters["sts/credentials"],
    });

    const params: CreateTopicInput = { Name: this.snsName };
    SNS.createTopic(params, (err, data) => {
      if (err) {
        this.showError(err.message, "createSns");
      } else {
        this.hideErrors("createSns");

        if (!data.TopicArn) {
          this.$router.push(`/messages/sns_topics`);
          return;
        }

        const arnPiecies = data.TopicArn.split(":");
        this.$router.push(
          `/messages/sns_topics?topic=${arnPiecies[arnPiecies.length - 1]}`
        );
      }
    });
  }
}
</script>

<style scoped></style>
