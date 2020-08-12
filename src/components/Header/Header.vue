<template>
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
          <gl-dropdown-header
            id="dropdown-header-roles"
            v-if="roles.length > 0"
          >
            Roles
          </gl-dropdown-header>
          <gl-dropdown-item
            v-for="(role, index) in roles"
            :key="index"
            :active="index === currentRoleIndex"
            @click="() => switchRole(index)"
          >
            {{ role.nickname || `${role.role} @ ${role.accountId}` }}
          </gl-dropdown-item>
          <gl-dropdown-item v-if="currentRoleIndex !== -1" @click="backToMain">
            Return to {{ mainUsername }}
          </gl-dropdown-item>
          <gl-dropdown-header id="dropdown-header-actions">
            Actions
          </gl-dropdown-header>
          <gl-dropdown-item v-gl-modal-directive="'assume-role-modal-id'">
            Assume role
          </gl-dropdown-item>
          <gl-dropdown-item @click="signOut">Sign Out</gl-dropdown-item>
        </gl-nav-item-dropdown>
      </b-navbar-nav>
      <b-navbar-nav class="ml-auto" v-else>
        <gl-nav-item to="/login">Login</gl-nav-item>
      </b-navbar-nav>
    </b-collapse>
  </gl-navbar>
</template>

<script lang="ts">
import {
  GlModalDirective,
  GlNavbar,
  GlNavItem,
  GlNavItemDropdown,
  GlDropdownItem,
  GlDropdownHeader,
} from "@gitlab/ui";

import {
  BCollapse,
  BNavbarBrand,
  BNavbarNav,
  BNavbarToggle,
} from "bootstrap-vue";
import RegionText from "@/components/common/RegionText.vue";
import { Component } from "vue-property-decorator";
import { Role } from "@/store/sts/state";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";

@Component({
  components: {
    RegionText,
    GlNavbar,
    BNavbarBrand,
    BNavbarToggle,
    GlNavItem,
    GlNavItemDropdown,
    GlDropdownItem,
    GlDropdownHeader,
    BNavbarNav,
    BCollapse,
  },
  directives: { "gl-modal-directive": GlModalDirective },
})
export default class Header extends DaintreeComponent {
  readonly vueVersion = process.env.VUE_APP_VERSION;

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
