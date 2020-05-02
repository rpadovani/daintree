<template>
  <div>
    <Header />
    <div class="container mt-2">
      <h2>Allocate a new Elastic IP</h2>
      <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
        Allocate an Elastic IP address by selecting the public IPv4 address pool
        from which the public IP address is to be allocated. Elastic IP
        addresses incur charges if they are not associated with a running
        instance or a network interface that is attached to a running instance.
        <a
          href="https://docs.aws.amazon.com/console/ec2/elastic-ips/allocate"
          target="_blank"
        >
          Learn more in the AWS Guide<gl-icon name="external-link" /> </a
        >.
      </gl-alert>
      <gl-form-group
        id="region-id"
        label="Region"
        label-size="sm"
        description="To see other regions, enable them in the settings, in the top right of the page."
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
        v-model="eipName"
        placeholder="Create a tag with key 'Name' and the value you insert."
      >
        <template #prepend>
          <b-input-group-text>Name</b-input-group-text>
        </template>
      </gl-form-input-group>

      <div class="row justify-content-between mt-3">
        <gl-button category="secondary" variant="danger" to="/network/eips">
          Cancel
        </gl-button>
        <gl-button
          :disabled="!canClick"
          category="primary"
          variant="success"
          @click="createEip"
          >Allocate Elastic IP
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
  GlIcon,
} from "@gitlab/ui";
import { BInputGroupText } from "bootstrap-vue";
import EC2Client from "aws-sdk/clients/ec2";
import { Component } from "vue-property-decorator";
import Notifications from "@/mixins/notifications";
import { mixins } from "vue-class-component";
import { Formatters } from "@/mixins/formatters";

@Component({
  components: {
    Header,
    GlFormSelect,
    GlFormGroup,
    GlAlert,
    GlFormInputGroup,
    BInputGroupText,
    GlButton,
    GlIcon,
  },
})
export default class NewEip extends mixins(Notifications, Formatters) {
  selectedRegion = "";
  eipName = "";

  get canClick() {
    return this.selectedRegion !== "";
  }

  createEip() {
    const EC2 = new EC2Client({
      region: this.selectedRegion,
      credentials: this.$store.getters["sts/credentials"],
    });

    EC2.allocateAddress({ Domain: "vpc" }, (err, data) => {
      if (err) {
        this.showError(err.message, "createEip");
      } else {
        this.hideErrors("createEip");

        this.showAlert({
          variant: "info",
          text: "Allocated Elastic IP with ID " + data.AllocationId,
          key: "creatingEip",
          resourceId: data.AllocationId,
        });

        if (this.eipName && data.AllocationId) {
          const params = {
            Resources: [data.AllocationId],
            Tags: [{ Key: "Name", Value: this.eipName }],
          };
          EC2.createTags(params, (err) => {
            if (err) {
              this.$store.commit("notifications/show", {
                variant: "danger",
                text: err,
                key: "creatingEip",
              });
            }

            this.$router.push("/network/eips");
          });
        } else {
          this.$router.push("/network/eips");
        }
      }
    });
  }
}
</script>

<style scoped></style>
