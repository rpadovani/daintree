<template>
  <div>
    <Header v-if="!onlyContent" :hide-refresher="true" />
    <div class="container mt-2">
      <h3>{{ resourceName }} resources</h3>
      <div class="row mt-2">
        <div
          class="col-12 col-sm-6 col-lg-3 mt-1"
          v-for="entry in entries"
          :key="entry.label"
        >
          <gl-avatar-link :to="entry.target">
            <gl-avatar-labeled
              :label="entry.label"
              :sub-label="entry.subLabel"
              :src="entry.iconUrl"
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
import { MenuEntry } from "@/components/common/menuEntry";

@Component({
  components: {
    Header,
    GlAvatarLabeled,
    GlAvatarLink,
  },
})
export default class ResourceMainMenu extends Vue {
  @Prop(Boolean) readonly onlyContent: boolean | undefined;
  @Prop(String) readonly resourceName!: string;
  @Prop(Array) readonly entries!: MenuEntry[];
}
</script>

<style scoped></style>
