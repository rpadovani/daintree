<template>
  <div class="container mt-2 mb-2">
    <h2>Create a new DHCP options set</h2>
    <gl-alert variant="tip" class="mb-2 mt-2" :dismissible="false">
      Creates a set of DHCP options for your VPC. After creating the set, you
      must associate it with the VPC, causing all existing and new instances
      that you launch in the VPC to use this set of DHCP options. For more
      information about the options, see
      <a href="http://www.ietf.org/rfc/rfc2132.txt" target="_blank">RFC 2132</a
      >.
    </gl-alert>

    <gl-form @submit="createDhcpOptions">
      <gl-form-group
        id="name-input-group"
        label="Name:"
        label-form="name-input"
        description="Create a tag with key 'Name' and the value you insert."
      >
        <gl-form-input
          id="name-input"
          v-model="form.name"
          placeholder="Enter name"
        />
      </gl-form-group>

      <RegionDropdown v-model="form.region" />

      <gl-form-group
        id="dns-input-group"
        label="Domain name servers:"
        label-form="dns-input"
        description="The IP addresses of up to four domain name servers, or AmazonProvidedDNS. The default DHCP option set specifies AmazonProvidedDNS. If specifying more than one domain name server, specify the IP addresses in a single parameter, separated by commas. To have your instance receive a custom DNS hostname as specified in domain name, you must set this to a custom DNS server."
      >
        <gl-form-input
          id="dns-input"
          v-model="form.dns"
          placeholder="Domain name servers"
        />
      </gl-form-group>

      <gl-form-group
        id="dn-input-group"
        label="Domain name:"
        label-form="dn-input"
        description="If you're using AmazonProvidedDNS in us-east-1, specify ec2.internal. If you're using AmazonProvidedDNS in another Region, specify region.compute.internal (for example, ap-northeast-1.compute.internal). Otherwise, specify a domain name (for example, ExampleCompany.com). This value is used to complete unqualified DNS hostnames. To specify multiple values, separate them by commas."
      >
        <gl-form-input
          id="dn-input"
          v-model="form.dn"
          placeholder="Domain name"
        />
      </gl-form-group>

      <gl-form-group
        id="ntp-input-group"
        label="NTP servers:"
        label-form="ntp-input"
        description="The IP addresses of up to four Network Time Protocol (NTP) servers, separated by commas."
      >
        <gl-form-input
          id="ntp-input"
          v-model="form.ntp"
          placeholder="NTP servers"
        />
      </gl-form-group>

      <gl-form-group
        id="nns-input-group"
        label="NetBIOS name servers:"
        label-form="nns-input"
        description="The IP addresses of up to four NetBIOS name servers, separated by commas."
      >
        <gl-form-input
          id="nns-input"
          v-model="form.nns"
          placeholder="NetBIOS name servers"
        />
      </gl-form-group>

      <gl-form-group
        id="nnt-input-group"
        label="NetBIOS node type:"
        label-form="nnt-input"
        description="The NetBIOS node type (1, 2, 4, or 8). We recommend that you specify 2 (broadcast and multicast are not currently supported)."
      >
        <gl-form-input
          id="nnt-input"
          v-model="form.nnt"
          placeholder="NetBIOS node type"
        />
      </gl-form-group>

      <div class="row justify-content-between mt-3">
        <gl-button category="secondary" variant="danger" to="/network/dhcp">
          Cancel
        </gl-button>
        <gl-button
          class="float-right"
          type="submit"
          category="primary"
          variant="success"
          :disabled="createButtonDisabled"
          :loading="isCreating"
          >Create new DHCP options set
        </gl-button>
      </div>
    </gl-form>
  </div>
</template>

<script lang="ts">
import {
  GlAlert,
  GlFormGroup,
  GlFormInputGroup,
  GlFormSelect,
  GlButton,
  GlForm,
  GlFormInput,
} from "@gitlab/ui";
import { BInputGroupText } from "bootstrap-vue";
import EC2Client, {
  CreateDhcpOptionsRequest,
  NewDhcpConfigurationList,
} from "aws-sdk/clients/ec2";
import { Component } from "vue-property-decorator";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import RegionDropdown from "@/components/common/formComponents/RegionDropdown.vue";
import VpcDropdown from "@/components/common/formComponents/VpcDropdown.vue";
import SubnetDropdown from "@/components/common/formComponents/SubnetDropdown.vue";

@Component({
  components: {
    VpcDropdown,
    RegionDropdown,
    GlFormSelect,
    GlFormGroup,
    GlAlert,
    GlFormInputGroup,
    BInputGroupText,
    GlButton,
    GlForm,
    GlFormInput,
    SubnetDropdown,
  },
})
export default class NewDhcpOptions extends DaintreeComponent {
  form = {
    region: "",
    name: "",
    dns: "",
    dn: "",
    ntp: "",
    nns: "",
    nnt: "",
  };

  isCreating = false;

  get createButtonDisabled(): boolean {
    return !this.form.region || this.isCreating;
  }

  async EC2(region: string): Promise<EC2Client | undefined> {
    const credentials = await this.credentials();

    if (!credentials) {
      return;
    }

    return new EC2Client({ region, credentials });
  }

  async createDhcpOptions(evt: Event): Promise<void> {
    evt.preventDefault();

    this.hideErrors("createDhcpOptions");

    const EC2 = await this.EC2(this.form.region);
    if (!EC2) {
      return;
    }

    const DhcpConfigurations: NewDhcpConfigurationList = [];

    if (this.form.dns) {
      DhcpConfigurations.push({
        Key: "domain-name-servers",
        Values: this.form.dns.split(","),
      });
    }

    if (this.form.dn) {
      DhcpConfigurations.push({
        Key: "domain-name",
        Values: this.form.dn.split(","),
      });
    }

    if (this.form.ntp) {
      DhcpConfigurations.push({
        Key: "ntp-servers",
        Values: this.form.ntp.split(","),
      });
    }

    if (this.form.nns) {
      DhcpConfigurations.push({
        Key: "netbios-name-servers",
        Values: this.form.nns.split(","),
      });
    }

    if (this.form.nnt) {
      DhcpConfigurations.push({
        Key: "netbios-node-type",
        Values: this.form.nnt.split(","),
      });
    }

    const params: CreateDhcpOptionsRequest = {
      DhcpConfigurations,
      TagSpecifications: [
        {
          ResourceType: "dhcp-options",
          Tags: [{ Key: "Name", Value: this.form.name }],
        },
      ],
    };

    try {
      this.isCreating = true;
      const data = await EC2.createDhcpOptions(params).promise();

      this.showAlert({
        variant: "success",
        text:
          "Created DHCP options set with ID " + data.DhcpOptions?.DhcpOptionsId,
        key: "creatingDhcpOptions",
        resourceId: data.DhcpOptions?.DhcpOptionsId,
      });
      this.$router.push("/network/dhcp");
    } catch (err) {
      this.showError(err.message, "createDhcpOptions");
    } finally {
      this.isCreating = false;
    }
  }
}
</script>
