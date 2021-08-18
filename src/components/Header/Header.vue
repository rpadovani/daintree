<template>
  <gl-navbar toggleable="lg" variant="dark" type="dark">
    <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

    <b-collapse id="nav-collapse" is-nav>
      <b-navbar-nav>
        <gl-nav-item-dropdown
          :text="selectedSection || 'All resources'"
          size="small"
        >
          <gl-search-box-by-type v-model.trim="sectionSearchTerm" class="m-2" />
          <gl-dropdown-item
            v-for="section in filteredSections"
            :key="section.name"
            :href="section.link"
          >
            {{ section.name }}
          </gl-dropdown-item>
          <gl-dropdown-item
            v-show="!filteredSections.length"
            class="text-secondary p-2"
          >
            Nothing found…
          </gl-dropdown-item>
        </gl-nav-item-dropdown>

        <gl-nav-item-dropdown
          key="subsections"
          :text="selectedSubsection || 'Select a subsection'"
          size="small"
          v-if="selectedSection"
        >
          <gl-search-box-by-type
            v-model.trim="subsectionSearchTerm"
            class="m-2"
          />
          <gl-dropdown-item
            v-for="section in filteredSubsections"
            :href="section.link"
            :key="section.name"
          >
            {{ section.name }}
          </gl-dropdown-item>
          <gl-dropdown-item
            v-show="!filteredSubsections.length"
            class="text-secondary p-2"
          >
            Nothing found…
          </gl-dropdown-item>
        </gl-nav-item-dropdown>
      </b-navbar-nav>

      <b-navbar-nav class="ml-auto">
        <div
          class="col my-auto"
          v-if="regions"
          v-gl-modal-directive="'region-modal-id'"
        >
          ciao
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
  GlDropdown,
  GlSearchBoxByType,
  GlIcon,
  GlLoadingIcon,
} from "@gitlab/ui";

import {
  BBreadcrumb,
  BBreadcrumbItem,
  BCollapse,
  BNavbarBrand,
  BNavbarNav,
  BNavbarToggle,
} from "bootstrap-vue";
import RegionText from "@/components/common/RegionText.vue";
import { Component } from "vue-property-decorator";
import { Role } from "@/store/sts/state";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
import { listen } from "@tauri-apps/api/event";

@Component({
  components: {
    BBreadcrumb,
    BBreadcrumbItem,
    BCollapse,
    BNavbarBrand,
    BNavbarNav,
    BNavbarToggle,

    GlDropdown,
    GlDropdownHeader,
    GlDropdownItem,
    GlIcon,
    GlLoadingIcon,
    GlNavItem,
    GlNavItemDropdown,
    GlNavbar,
    GlSearchBoxByType,

    RegionText,
  },
  directives: { "gl-modal-directive": GlModalDirective },
})
export default class Header extends DaintreeComponent {
  get regions(): string[] {
    return this.$store.getters["sts/regions"];
  }

  get roles(): Role[] {
    return this.$store.getters["sts/roles"];
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

  async switchRole(roleIndex: number): Promise<void> {
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

  get selectedSection(): "Network" | "EC2" | undefined {
    const found = this.sections.find(
      (s) => s.link.split("/")[1] === this.$route.path.split("/")[1]
    );

    return found ? (found.name as "Network" | "EC2") : undefined;
  }

  get selectedSubsection(): string | undefined {
    if (!this.selectedSection) {
      return undefined;
    }

    const found = this.subsections[this.selectedSection].find((s) => {
      return `#${this.$route.fullPath}`.startsWith(s.link);
    });

    return found ? found.name : undefined;
  }

  lastRefresh!: Date;
  get lastRefreshString(): string {
    if (this.isLoading) {
      return "Last refresh: now";
    }
    return `Last refresh: ${this.standardDate(this.lastRefresh)}`;
  }

  refresh(): void {
    this.$root.$emit("refresh");
  }

  sectionSearchTerm = "";
  readonly sections = [
    { name: "Network", link: "#/network" },
    { name: "EC2", link: "#/ec2" },
    { name: "Messages", link: "#/messages" },
    { name: "ECS", link: "#/ecs" },
  ];

  subsectionSearchTerm = "";
  readonly subsections = {
    Network: [
      { name: "VPCs", link: "#/network/vpcs" },
      { name: "Subnets", link: "#/network/subnets" },
      { name: "Internet Gateways", link: "#/network/igws" },
      { name: "Nat Gateways", link: "#/network/nats" },
      { name: "Route Tables", link: "#/network/routeTables" },
      { name: "Elastic IPs", link: "#/network/eips" },
      { name: "Security Groups", link: "#/network/securityGroups" },
      { name: "Peering connections", link: "#/network/peeringConnections" },
      { name: "Endpoints", link: "#/network/endpoints" },
      { name: "Network interfaces", link: "#/network/interfaces" },
      { name: "DHCP options sets", link: "#/network/dhcp" },
    ],
    EC2: [
      { name: "Instances", link: "#/ec2/instances" },
      { name: "Load Balancers", link: "#/ec2/load_balancers" },
      { name: "Target groups", link: "#/ec2/target_groups" },
      { name: "Key pairs", link: "#/ec2/key_pairs" },
      { name: "EBS volumes", link: "#/ec2/volumes" },
      { name: "EBS snapshots", link: "#/ec2/snapshots" },
    ],
    Messages: [
      { name: "SNS Topics", link: "#/messages/sns_topics" },
      { name: "SNS Subscriptions", link: "#/messages/sns_subscriptions" },
      { name: "SQS", link: "#/messages/sqs" },
    ],
    ECS: [
      { name: "Tasks definitions", link: "#/ecs/tasksDefinitions" },
      { name: "Clusters", link: "#/ecs/clusters" },
    ],
  };

  get filteredSections(): { name: string; link: string }[] {
    const lowerCasedSearchTerm = this.sectionSearchTerm.toLowerCase();
    return this.sections.filter((resultString) =>
      resultString["name"].toLowerCase().includes(lowerCasedSearchTerm)
    );
  }

  get filteredSubsections(): { name: string; link: string }[] {
    const lowerCasedSearchTerm = this.subsectionSearchTerm.toLowerCase();
    if (this.selectedSection) {
      return this.subsections[this.selectedSection].filter((resultString) =>
        resultString["name"].toLowerCase().includes(lowerCasedSearchTerm)
      );
    }

    return [];
  }
}
</script>
