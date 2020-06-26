<template>
  <div id="app">
    <CloudwatchModal />
    <RegionModal />
    <AssumeRoleModal />

    <Header />
    <SubHeader />
    <Notifier />

    <router-view />
  </div>
</template>
<script lang="ts">
import CloudwatchModal from "@/components/cloudwatch/CloudwatchModal.vue";
import { Component, Vue } from "vue-property-decorator";
import AssumeRoleModal from "@/components/Header/AssumeRoleModal.vue";
import RegionModal from "@/components/Header/RegionModal.vue";
import Header from "@/components/Header/Header.vue";
import SubHeader from "@/components/Header/SubHeader.vue";
import Notifier from "@/components/Header//Notifier.vue";

@Component({
  components: {
    Header,
    CloudwatchModal,
    AssumeRoleModal,
    RegionModal,
    SubHeader,
    Notifier,
  },
})
export default class App extends Vue {}
</script>
