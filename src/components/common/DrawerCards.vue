<template>
  <div class="row justify-content-around">
    <gl-card
      class="col-12 col-sm-5 col-lg-3 mt-3 mt-sm-2 mr-lg-1 pl-0 pr-0 text-center"
      v-for="card in filteredCards"
      :key="card.title"
    >
      <template #header>
        {{ card.title }}
        <gl-icon
          class="float-right"
          name="question"
          v-if="card.helpText"
          v-gl-tooltip.hover
          :title="card.helpText"
        />
      </template>
      <gl-link :to="card.linkTo" v-if="card.linkTo">
        {{ card.value }}
      </gl-link>
      <RegionText
        v-else-if="card.isRegion || card.isAz"
        :region="card.value"
        :is-az="card.isAz"
      />
      <gl-badge
        v-else-if="typeof card.value === 'boolean'"
        :variant="card.value ? 'success' : 'danger'"
      >
        {{ card.value }}
      </gl-badge>
      <code v-else-if="card.isCode">
        {{ card.value }}
      </code>
      <span v-else>
        {{ card.value }}
      </span>
    </gl-card>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import {
  GlCard,
  GlLink,
  GlBadge,
  GlIcon,
  GlTooltipDirective,
} from "@gitlab/ui";
import RegionText from "./RegionText.vue";
import { CardContent } from "@/components/common/cardContent";
@Component({
  components: {
    GlCard,
    GlBadge,
    GlLink,
    RegionText,
    GlIcon,
  },
  directives: {
    "gl-tooltip": GlTooltipDirective,
  },
})
export default class DrawerCards extends Vue {
  @Prop(Array) readonly cards!: CardContent[];

  get filteredCards(): CardContent[] {
    return this.cards.filter(
      (card) =>
        (card.value !== undefined && card.value !== "") || card.showIfEmpty
    );
  }
}
</script>

<style scoped></style>
