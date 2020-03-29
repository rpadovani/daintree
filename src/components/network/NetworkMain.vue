<template>
  <div>
    <Header v-if="!onlyContent" :hide-refresher="true" />
    <div class="container mt-2">
      <h3>Network resources</h3>
      <div class="row mt-2">
        <div class="col-3">
          <gl-avatar-link to="/network/vpcs">
            <gl-avatar-labeled
              label="VPCs"
              sub-label="Isolated Cloud Resources"
              src="/assets/aws-icons/network/Amazon-VPC.svg"
              shape="rect"
              :size="32"
            >
            </gl-avatar-labeled>
          </gl-avatar-link>
        </div>
        <div class="col-3">
          <gl-avatar-link to="/network/subnets">
            <gl-avatar-labeled
              label="Subnets"
              sub-label="Logical subdivision IP network"
              src="/assets/aws-icons/network/VPC-subnet-private_light-bg.svg"
              shape="rect"
              :size="32"
            >
            </gl-avatar-labeled>
          </gl-avatar-link>
        </div>
        <div class="col-3">
          <gl-avatar-link to="/network/igws">
            <gl-avatar-labeled
              label="Internet Gateways"
              sub-label="Connect to the Internet"
              src="/assets/aws-icons/network/Amazon-VPC_Internet-Gateway_light-bg.svg"
              shape="rect"
              :size="32"
            >
            </gl-avatar-labeled>
          </gl-avatar-link>
        </div>
        <div class="col-3">
          <gl-avatar-link to="/network/nats">
            <gl-avatar-labeled
              label="Nat Gateways"
              sub-label="Network Address Translation"
              src="/assets/aws-icons/network/Amazon-VPC_NAT-Gateway_light-bg.svg"
              shape="rect"
              :size="32"
            >
            </gl-avatar-labeled>
          </gl-avatar-link>
        </div>
      </div>

      <div class="row mt-2">
        <div class="col-3">
          <gl-avatar-link to="/network/routeTables">
            <gl-avatar-labeled
              label="Route Tables"
              sub-label="Route your traffic"
              src="/assets/aws-icons/network/Amazon-Route-53_Route-Table_light-bg.svg"
              shape="rect"
              :size="32"
            />
          </gl-avatar-link>
        </div>
        <div class="col-3">
          <gl-avatar-link to="/network/eips">
            <gl-avatar-labeled
              label="Elastic IPs"
              sub-label="Static IPv4 addresses"
              src="/assets/aws-icons/network/Amazon-EC2_Elastic-IP-Address_light-bg.svg"
              shape="rect"
              :size="32"
            />
          </gl-avatar-link>
        </div>
        <div class="col-3">
          <gl-avatar-link to="/network/securityGroups">
            <gl-avatar-labeled
              label="Security groups"
              sub-label="Virtual firewalls"
              shape="rect"
              :size="32"
            />
          </gl-avatar-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { GlAvatarLabeled, GlAvatarLink } from "@gitlab/ui";
import { Component, Prop, Vue } from "vue-property-decorator";
import Header from "@/components/Header/Header.vue";

@Component({
  components: {
    Header,
    GlAvatarLabeled,
    GlAvatarLink
  }
})
export default class NetworkMain extends Vue {
  @Prop(Boolean) readonly onlyContent: boolean | undefined;
}
</script>

<style scoped></style>
