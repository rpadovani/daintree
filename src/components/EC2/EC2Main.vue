<template>
  <div>
    <Header v-if="!onlyContent" :hide-refresher="true" />
    <div class="container mt-2">
      <h3>EC2 resources</h3>
      <div class="row mt-2">
        <div class="col-3">
          <gl-avatar-link to="/ec2/instances">
            <gl-avatar-labeled
              label="Instances"
              sub-label="Resizable compute capacity"
              src="/assets/aws-icons/ec2/Amazon-EC2_Instances_light-bg.svg"
              shape="rect"
              :size="32"
            >
            </gl-avatar-labeled>
          </gl-avatar-link>
        </div>
        <div class="col-3">
          <gl-avatar-link to="/ec2/loadBalancers">
            <gl-avatar-labeled
              label="Load balancers"
              sub-label="Incoming traffic distribution"
              src="/assets/aws-icons/ec2/Elastic-Load-Balancing.svg"
              shape="rect"
              :size="32"
            >
            </gl-avatar-labeled>
          </gl-avatar-link>
        </div>
        <div class="col-3">
          <gl-avatar-link to="/ec2/targetGroups">
            <gl-avatar-labeled
              label="Target groups"
              sub-label="Route requests to targets"
              shape="rect"
              :size="32"
            >
            </gl-avatar-labeled>
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
    GlAvatarLink,
  },
})
export default class EC2Main extends Vue {
  @Prop(Boolean) readonly onlyContent: boolean | undefined;
}
</script>

<style scoped></style>
