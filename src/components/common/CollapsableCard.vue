<template>
  <gl-card class="col-12 mt-3 mt-sm-2 pl-0 pr-0 text-center">
    <template #header>
      <span @click="visible = !visible">
        <gl-icon
          class="float-left"
          :name="visible ? 'chevron-lg-up' : 'chevron-lg-down'"
        />
        {{ title }}

        <gl-icon
          class="float-right"
          name="question"
          v-if="helpText"
          v-gl-tooltip.hover
          :title="helpText"
        />
      </span>
    </template>

    <i v-if="!visible" @click="visible = !visible">
      Click here or on the title to show this section
    </i>

    <gl-collapse id="environment-variables" v-model="visible">
      <slot> </slot>
    </gl-collapse>
  </gl-card>
</template>

<script lang="ts">
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import { Component, Prop } from "vue-property-decorator";
import {
  GlButton,
  GlCard,
  GlCollapse,
  GlIcon,
  GlTooltipDirective,
} from "@gitlab/ui";

@Component({
  components: {
    GlButton,
    GlCard,
    GlCollapse,
    GlIcon,
  },
  directives: {
    "gl-tooltip": GlTooltipDirective,
  },
})
export default class CollapsableCard extends DaintreeComponent {
  @Prop(String) title!: string;
  @Prop(String) helpText: boolean | undefined;
  visible = false;
}
</script>
