<template>
  <div>
    <Header hide-refresher />
    <NetworkMain only-content />
    <EC2Main only-content />
    <MessagesMain only-content />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import NetworkMain from "./network/NetworkMain.vue";
import Header from "@/components/Header/Header.vue";
import EC2Main from "@/components/EC2/EC2Main.vue";
import MessagesMain from "@/components/messages/MessagesMain.vue";

@Component({ components: { MessagesMain, NetworkMain, Header, EC2Main } })
export default class MainMenu extends Vue {}
</script>

<style scoped></style>
