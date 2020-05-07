<template>
  <div id="app">
    <CloudwatchModal />
    <router-view />
  </div>
</template>
<script lang="ts">
import CloudwatchModal from "@/components/cloudwatch/CloudwatchModal.vue";
import { Component, Vue } from "vue-property-decorator";
@Component({
  components: { CloudwatchModal },
})
export default class App extends Vue {}
</script>
