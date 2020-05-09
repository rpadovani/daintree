<template>
  <div>
    <span
      class="flag-icon"
      :class="flag"
      v-gl-tooltip.${modifier}
      :title="region"
    ></span>
    <span v-if="!compact" class="ml-1">{{ region }}</span>
  </div>
</template>

<script lang="ts">
import { GlTooltipDirective } from "@gitlab/ui";
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  directives: {
    "gl-tooltip": GlTooltipDirective,
  },
})
export default class RegionText extends Vue {
  @Prop(String) readonly region!: string;
  @Prop(Boolean) readonly compact!: boolean;
  @Prop(Boolean) readonly isAz!: boolean;

  get flag() {
    const region = this.isAz
      ? this.region.substring(0, this.region.length - 1)
      : this.region;

    //When you insert a new flag here, remember to update the css in flags.css to include the icon
    switch (region) {
      case "us-east-1":
      case "us-east-2":
      case "us-west-1":
      case "us-west-2":
      case "us-gov-east-1":
      case "us-gov-west-1":
        return "flag-icon-us";
      case "af-south-1":
        return "flag-icon-za";
      case "ap-east-1":
        return "flag-icon-hk";
      case "ap-south-1":
        return "flag-icon-in";
      case "ap-northeast-1":
      case "ap-northeast-3":
        return "flag-icon-jp";
      case "ap-northeast-2":
        return "flag-icon-kr";
      case "ap-southeast-1":
        return "flag-icon-sg";
      case "ap-southeast-2":
        return "flag-icon-au";
      case "ca-central-1":
        return "flag-icon-ca";
      case "cn-northwest-1":
      case "cn-north-1":
        return "flag-icon-cn";
      case "eu-central-1":
        return "flag-icon-de";
      case "eu-west-1":
        return "flag-icon-ie";
      case "eu-west-2":
        return "flag-icon-gb";
      case "eu-west-3":
        return "flag-icon-fr";
      case "eu-north-1":
        return "flag-icon-se";
      case "eu-south-1":
        return "flag-icon-it";
      case "me-south-1":
        return "flag-icon-bh";
      case "sa-east-1":
        return "flag-icon-br";
      default:
        return "";
    }
  }
}
</script>

<style scoped></style>
