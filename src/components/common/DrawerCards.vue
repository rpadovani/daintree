<template>
  <div class="row justify-content-around">
    <gl-card
      class="col-12 col-sm-5 col-lg-3 mt-sm-2 mr-lg-1"
      v-for="card in cards"
      :key="card.title"
      :title="card.title"
    >
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
      <span v-else>
        {{ card.value }}
      </span>
    </gl-card>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { GlCard, GlLink, GlBadge } from "@gitlab/ui";
import RegionText from "./RegionText.vue";
import { CardContent } from "@/components/common/cardContent";
@Component({
  components: {
    GlCard,
    GlBadge,
    GlLink,
    RegionText,
  },
})
export default class DrawerCards extends Vue {
  @Prop(Array) readonly cards!: CardContent[];
}
</script>

<style scoped></style>
