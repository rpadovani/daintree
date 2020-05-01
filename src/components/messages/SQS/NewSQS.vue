<template>
  <div>
    <Header hide-refresher />
    <div class="container mt-2">
      <h2>Create a new queue</h2>
      <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
        SQS offers two types of message queues. Standard queues offer maximum
        throughput, best-effort ordering, and at-least-once delivery. SQS FIFO
        queues are designed to guarantee that messages are processed exactly
        once, in the exact order that they are sent.
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
        v-model="sqsName"
        placeholder="FIFO queues names need to end with .fifo."
      >
        <template #prepend>
          <b-input-group-text>Name</b-input-group-text>
        </template>
      </gl-form-input-group>

      <div class="row justify-content-between mt-3">
        <gl-button category="secondary" variant="danger" to="/messages/sqs">
          Cancel
        </gl-button>
        <gl-button
          class="float-right"
          category="primary"
          variant="success"
          @click="createSqs"
          >Create SQS
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
  GlButton
} from "@gitlab/ui";
import { BInputGroupText } from "bootstrap-vue";
import { Component } from "vue-property-decorator";
import Notifications from "@/mixins/notifications";
import SQSClient, { CreateQueueRequest } from "aws-sdk/clients/sqs";

@Component({
  components: {
    Header,
    GlFormSelect,
    GlFormGroup,
    GlAlert,
    GlFormInputGroup,
    BInputGroupText,
    GlButton
  }
})
export default class NewSQS extends Notifications {
  selectedRegion = "";
  sqsName = "";

  createSqs() {
    const SQS = new SQSClient({
      region: this.selectedRegion,
      credentials: this.$store.getters["sts/credentials"]
    });

    const params: CreateQueueRequest = { QueueName: this.sqsName };
    SQS.createQueue(params, (err, data) => {
      if (err) {
        this.showError(err.message, "createSqs");
      } else {
        this.hideErrors("createSqs");

        this.$router.push(`/messages/sqs?queueUrl=${data.QueueUrl}`);
      }
    });
  }
}
</script>

<style scoped></style>
