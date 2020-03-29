<template>
  <div>
    <Header hide-refresher />
    <div class="container mt-2">
      <h2>Create a new VPC</h2>
      <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
        A VPC is an isolated portion of the AWS cloud populated by AWS objects,
        such as Amazon EC2 instances. You must specify an IPv4 address range for
        your VPC. Specify the IPv4 address range as a Classless Inter-Domain
        Routing (CIDR) block; for example, 10.0.0.0/16.<br />

        The smallest VPC you can create uses a /28 netmask (16 IPv4 addresses),
        and the largest uses a /16 netmask (65,536 IPv4 addresses)
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
        v-model="vpcName"
        placeholder="Create a tag with key 'Name' and the value you insert."
      >
        <template #prepend>
          <b-input-group-text>Name</b-input-group-text>
        </template>
      </gl-form-input-group>
      <gl-form-input-group
        required
        v-model="cidrBlock"
        class="mt-3"
        placeholder="The range of IPv4 addresses for your VPC in CIDR block format."
      >
        <template #prepend>
          <b-input-group-text>IPv4 CIDR block</b-input-group-text>
        </template>
      </gl-form-input-group>
      <div class="row justify-content-between mt-3">
        <gl-button category="secondary" variant="danger" to="/network/vpcs">
          Cancel
        </gl-button>
        <gl-button
          class="float-right"
          category="primary"
          variant="success"
          @click="createVpc"
          >Create VPC
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
import AWS from "aws-sdk";
import { Component } from "vue-property-decorator";
import Notifications from "@/mixins/notifications";

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
export default class NewVPC extends Notifications {
  selectedRegion = "";
  cidrBlock = "";
  vpcName = "";

  createVpc() {
    const EC2 = new AWS.EC2({ region: this.selectedRegion });
    EC2.createVpc({ CidrBlock: this.cidrBlock }, (err, data) => {
      if (err) {
        this.showError(err.message, "createVpc");
      } else {
        this.hideErrors("createVpc");

        //We cannot set tags with `createVpc`
        if (this.vpcName && data.Vpc && data.Vpc.VpcId) {
          const params = {
            Resources: [data.Vpc.VpcId],
            Tags: [{ Key: "Name", Value: this.vpcName }]
          };
          EC2.createTags(params, err => {
            if (err) {
              this.showError(err.message, "createVpc");
            } else {
              this.$router.push("/network/vpcs");
            }
          });
        } else {
          this.$router.push("/network/vpcs");
        }
      }
    });
  }
}
</script>

<style scoped></style>
