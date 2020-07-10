<template>
  <gl-form-group
    id="region-id"
    :label="label"
    label-size="sm"
    description="To see other regions, enable them in the settings."
    label-for="region-input"
  >
    <gl-form-select
      id="region-input"
      v-model="regionValue"
      @change="changedRegion"
      :options="[
        { value: '', text: 'Select a region' },
        ...this.$store.getters['sts/regions'],
      ]"
      required
    />
  </gl-form-group>
</template>

<script lang="ts">
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import { Component, Emit, Model, Prop } from "vue-property-decorator";

import { GlFormGroup, GlFormSelect } from "@gitlab/ui";

@Component({
  components: {
    GlFormGroup,
    GlFormSelect,
  },
})
export default class RegionDropdown extends DaintreeComponent {
  @Model("change", { type: String }) readonly region!: boolean;
  @Prop({ default: "Region:" }) readonly label!: string;

  private regionValue = "";

  @Emit("change")
  changedRegion(): string {
    return this.regionValue;
  }
}
</script>

<style scoped></style>
