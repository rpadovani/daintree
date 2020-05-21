<template>
  <div>
    <RegionModal />
    <AssumeRoleModal />
    <gl-navbar toggleable="lg" variant="dark" type="dark">
      <b-navbar-brand tag="h1" class="mb-0" to="/home">
        <img
          src="/assets/undraw_japan_ubgk.svg"
          class="d-inline-block align-top"
          height="30px"
          alt="Daintree"
        />
        Daintree
      </b-navbar-brand>
      <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

      <b-collapse id="nav-collapse" is-nav>
        <b-navbar-nav>
          <gl-nav-item to="/changelog">{{ vueVersion }}</gl-nav-item>
          <gl-nav-item to="/about">Features</gl-nav-item>
          <gl-nav-item to="/contribute">Contribute</gl-nav-item>
        </b-navbar-nav>
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
          <gl-nav-item-dropdown :text="prettyCredentials" right size="lg">
            <gl-new-dropdown-header
              id="dropdown-header-roles"
              v-if="roles.length > 0"
            >
              Roles
            </gl-new-dropdown-header>
            <gl-new-dropdown-item
              v-for="(role, index) in roles"
              :key="index"
              :active="index === currentRoleIndex"
              @click="() => switchRole(index)"
            >
              {{ role.nickname || `${role.role} @ ${role.accountId}` }}
            </gl-new-dropdown-item>
            <gl-new-dropdown-item
              v-if="currentRoleIndex !== -1"
              @click="backToMain"
            >
              Return to {{ mainUsername }}
            </gl-new-dropdown-item>
            <gl-new-dropdown-header id="dropdown-header-actions">
              Actions
            </gl-new-dropdown-header>
            <gl-new-dropdown-item v-gl-modal-directive="'assume-role-modal-id'">
              Assume role
            </gl-new-dropdown-item>
            <gl-new-dropdown-item @click="signOut"
              >Sign Out</gl-new-dropdown-item
            >
          </gl-nav-item-dropdown>
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
import {
  GlModalDirective,
  GlNavbar,
  GlNavItem,
  GlNavItemDropdown,
  GlNewDropdownItem,
  GlNewDropdownHeader,
} from "@gitlab/ui";

import SubHeader from "./SubHeader.vue";
import Notifier from "./Notifier.vue";

import {
  BCollapse,
  BNavbarBrand,
  BNavbarNav,
  BNavbarToggle,
} from "bootstrap-vue";
import RegionText from "@/components/common/RegionText.vue";
import RegionModal from "@/components/Header/RegionModal.vue";
import { Component, Emit, Prop, Vue } from "vue-property-decorator";
import AssumeRoleModal from "@/components/Header/AssumeRoleModal.vue";
import { Role } from "@/store/sts/state";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";

@Component({
  components: {
    AssumeRoleModal,
    RegionModal,
    RegionText,
    GlNavbar,
    BNavbarBrand,
    BNavbarToggle,
    GlNavItem,
    GlNavItemDropdown,
    GlNewDropdownItem,
    GlNewDropdownHeader,
    BNavbarNav,
    BCollapse,
    SubHeader,
    Notifier,
  },
  directives: { "gl-modal-directive": GlModalDirective },
})
export default class Header extends DaintreeComponent {
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

  async switchRole(roleIndex: number) {
    try {
      this.hideErrors("switchRoleError");
      await this.$store.dispatch("sts/assumeRole", {
        ...this.roles[roleIndex],
        newRole: false,
      });
    } catch (e) {
      this.showError(e, "switchRoleError");
    }
  }
}
</script>

<style scoped></style>
