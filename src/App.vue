<template>
  <div id="app">
    <CloudwatchModal />
    <RegionModal />
    <AssumeRoleModal />

    <Announcements />
    <Notifier />

    <router-view />
  </div>
</template>
<script lang="ts">
import CloudwatchModal from "@/components/cloudwatch/CloudwatchModal.vue";
import { Component, Ref, Vue } from "vue-property-decorator";
import AssumeRoleModal from "@/components/Header/AssumeRoleModal.vue";
import RegionModal from "@/components/Header/RegionModal.vue";
import Header from "@/components/Header/Header.vue";
import SubHeader from "@/components/Header/SubHeader.vue";
import Notifier from "@/components/Header//Notifier.vue";
import Announcements from "@/components/common/Announcements.vue";
import { listen } from "@tauri-apps/api/event";
import { BvModal } from "bootstrap-vue";

@Component({
  components: {
    Announcements,
    Header,
    CloudwatchModal,
    AssumeRoleModal,
    RegionModal,
    SubHeader,
    Notifier,
  },
})
export default class App extends Vue {
  @Ref() readonly bvModal!: BvModal;

  mounted(): void {
    listen("navigate_to", (event: { payload: { message: string } }) => {
      this.$router.push(event.payload.message);
    });
  }
}
</script>
