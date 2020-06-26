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
      <StateText v-else-if="card.isState" :state="card.value" />
      <gl-progress-bar
        v-else-if="card.isProgress"
        :value="parseInt(card.value)"
        :variant="parseInt(card.value) === 100 ? 'success' : 'primary'"
      />
      <ul v-else-if="card.linksTo" class="gl-list-style-none">
        <li v-for="link in card.linksTo" :key="link.text" class="ml-n2">
          <gl-link :to="link.to" class="pb-2">
            {{ link.text }}
          </gl-link>
        </li>
      </ul>
      <span v-else-if="card.azs">
        <RegionText
          v-for="az in card.azs"
          :key="az"
          :region="az"
          :is-az="true"
          class="pb-2"
        />
      </span>
      <span v-else>
        {{ card.value }}

        <span v-if="card.value === accountId">(this account)</span>
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
  GlProgressBar,
} from "@gitlab/ui";
import RegionText from "./RegionText.vue";
import { CardContent } from "@/components/common/cardContent";
import StateText from "@/components/common/StateText.vue";
import { mapGetters } from "vuex";
@Component({
  components: {
    StateText,
    GlCard,
    GlBadge,
    GlLink,
    RegionText,
    GlIcon,
    GlProgressBar,
  },
  directives: {
    "gl-tooltip": GlTooltipDirective,
  },
  computed: {
    ...mapGetters("sts", {
      accountId: "account",
    }),
  },
})
export default class DrawerCards extends Vue {
  @Prop(Array) readonly cards!: CardContent[];

  accountId!: string | undefined;

  get filteredCards(): CardContent[] {
    return this.cards.filter(
      (card) =>
        (card.value !== undefined && card.value !== "") ||
        card.showIfEmpty ||
        (card.linksTo && card.linksTo.length > 0) ||
        (card.azs && card.azs.length > 0)
    );
  }
}
</script>
