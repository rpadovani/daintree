<template>
  <div>
    <RegionModal />
    <AssumeRoleModal />
    <gl-navbar variant="dark" type="dark">
      <b-navbar-brand tag="h1" class="mb-0" to="/home">
        <img
          src="/assets/undraw_japan_ubgk.svg"
          class="d-inline-block align-top"
          height="30px"
          alt="Daintree"
        />
        Daintree
      </b-navbar-brand>
      <b-navbar-nav>
        <gl-nav-item to="/changelog">{{ vueVersion }}</gl-nav-item>
        <gl-nav-item to="/about">Features</gl-nav-item>
        <gl-nav-item to="/contribute">Contribute</gl-nav-item>
      </b-navbar-nav>
      <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>
      <b-collapse id="nav-collapse" is-nav>
        <b-navbar-nav class="ml-auto" v-if="prettyCredentials">
          <div
            class="col my-auto"
            v-if="regions"
            v-gl-modal-directive="'region-modal-id'"
          >
            <div class="row" v-for="n in nrRegionsRows" :key="n">
              <RegionText
                class="ml-1"
                v-for="r in getRegionsForRow(n)"
                :key="r"
                :region="r"
                :compact="true"
              />
            </div>
          </div>
          <b-nav-item-dropdown style="color: white" right size="lg">
            <template v-slot:button-content>
              {{ prettyCredentials }}
            </template>
            <b-dropdown-header
              id="dropdown-header-roles"
              v-if="roles.length > 0"
            >
              Roles
            </b-dropdown-header>
            <b-dropdown-item
              v-for="(role, index) in roles"
              :key="index"
              :active="index === currentRoleIndex"
              @click="() => switchRole(index)"
            >
              {{ role.nickname || `${role.role} @ ${role.accountId}` }}
            </b-dropdown-item>
            <b-dropdown-item v-if="currentRoleIndex !== -1" @click="backToMain">
              Return to {{ mainUsername }}
            </b-dropdown-item>
            <b-dropdown-header id="dropdown-header-actions">
              Actions
            </b-dropdown-header>
            <b-dropdown-item v-gl-modal-directive="'assume-role-modal-id'">
              Assume role
            </b-dropdown-item>
            <b-dropdown-item @click="signOut">Sign Out</b-dropdown-item>
          </b-nav-item-dropdown>
        </b-navbar-nav>
        <b-navbar-nav class="ml-auto" v-else>
          <gl-nav-item to="/login">Login</gl-nav-item>
        </b-navbar-nav>
      </b-collapse>
    </gl-navbar>

    <SubHeader
      v-if="!hideSubHeader"
      :loading="loading"
      :hide-refresh="hideRefresher"
      v-on:refresh="refresh"
    />

    <Notifier />
  </div>
</template>

<script lang="ts">
import { GlModalDirective, GlNavbar, GlNavItem } from "@gitlab/ui";

import SubHeader from "./SubHeader.vue";
import Notifier from "./Notifier.vue";

import {
  BCollapse,
  BDropdownItem,
  BDropdownHeader,
  BNavbarBrand,
  BNavbarNav,
  BNavbarToggle,
  BNavItemDropdown
} from "bootstrap-vue";
import RegionText from "@/components/common/RegionText.vue";
import RegionModal from "@/components/Header/RegionModal.vue";
import { Component, Emit, Prop, Vue } from "vue-property-decorator";
import AssumeRoleModal from "@/components/Header/AssumeRoleModal.vue";
import { Role } from "@/store/sts/state";

@Component({
  components: {
    AssumeRoleModal,
    RegionModal,
    RegionText,
    GlNavbar,
    BNavbarBrand,
    BNavbarToggle,
    GlNavItem,
    BNavItemDropdown,
    BDropdownItem,
    BDropdownHeader,
    BNavbarNav,
    BCollapse,
    SubHeader,
    Notifier
  },
  directives: { "gl-modal-directive": GlModalDirective }
})
export default class Header extends Vue {
  @Prop(Boolean) readonly hideSubHeader: boolean | undefined;
  @Prop(Boolean) readonly loading: boolean | undefined;
  @Prop(Boolean) readonly hideRefresher: boolean | undefined;

  readonly vueVersion = process.env.VUE_APP_VERSION;

  @Emit("refresh")
  refresh() {
    return true;
  }

  get regions(): string[] {
    return this.$store.getters["sts/regions"];
  }

  get roles(): Role[] {
    return this.$store.getters["sts/roles"];
  }

  get currentRoleIndex() {
    return this.$store.getters["sts/currentRoleIndex"];
  }

  get prettyCredentials(): string {
    return this.$store.getters["sts/currentPrettyCredentials"];
  }

  get mainUsername() {
    return this.$store.getters["sts/mainAccountUsername"];
  }

  get nrRegionsRows() {
    return Math.floor(this.regions.length / 11) + 1;
  }

  getRegionsForRow(n: number) {
    const startingIndex = (n - 1) * 11;
    return this.regions.slice(startingIndex, startingIndex + 11);
  }

  signOut() {
    this.$store.commit("sts/logout");
    this.$router.push("/");
  }

  backToMain() {
    this.$store.commit("sts/backToMain");
  }

  switchRole(roleIndex: number) {
    this.$store.dispatch("sts/assumeRole", {
      ...this.roles[roleIndex],
      newRole: false
    });
  }
}
</script>

<style scoped></style>
