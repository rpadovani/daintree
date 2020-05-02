<template>
  <div class="row justify-content-between mr-0">
    <b-breadcrumb class="gl-breadcrumb-list col-6 ml-5 mt-1">
      <b-breadcrumb-item href="/#/home" class="gl-breadcrumb-item">
        Resources
      </b-breadcrumb-item>

      <!-- We set the breadcrumb to active so it doesn't create a <Link> element which would interfere with the search box -->
      <b-breadcrumb-item class="gl-breadcrumb-item" active>
        <gl-new-dropdown
          :text="selectedSection || 'Select a section'"
          size="small"
        >
          <gl-search-box-by-type v-model.trim="sectionSearchTerm" class="m-2" />
          <gl-new-dropdown-item
            v-for="section in filteredSections"
            :key="section.name"
            :href="section.link"
          >
            {{ section.name }}
          </gl-new-dropdown-item>
          <gl-new-dropdown-item
            v-show="!filteredSections.length"
            class="text-secondary p-2"
          >
            Nothing found…
          </gl-new-dropdown-item>
        </gl-new-dropdown>
      </b-breadcrumb-item>

      <!-- We set the breadcrumb to active so it doesn't create a <Link> element which would interfere with the search box -->
      <b-breadcrumb-item
        v-if="selectedSection"
        class="gl-breadcrumb-item"
        active
      >
        <gl-new-dropdown
          key="subsections"
          :text="selectedSubsection || 'Select a subsection'"
          size="small"
        >
          <gl-search-box-by-type
            v-model.trim="subsectionSearchTerm"
            class="m-2"
          />
          <gl-new-dropdown-item
            v-for="section in filteredSubsections"
            :href="section.link"
            :key="section.name"
          >
            {{ section.name }}
          </gl-new-dropdown-item>
          <gl-new-dropdown-item
            v-show="!filteredSubsections.length"
            class="text-secondary p-2"
          >
            Nothing found…
          </gl-new-dropdown-item>
        </gl-new-dropdown>
      </b-breadcrumb-item>
    </b-breadcrumb>

    <div class="col-1 mt-1 mr-0 pr-3">
      <gl-icon
        class="float-right"
        v-if="!hideRefresh && !loading"
        name="retry"
        @click="refresh"
      />
      <gl-loading-icon
        class="float-right"
        v-if="loading"
        inline
        label="Loading"
      ></gl-loading-icon>
    </div>
  </div>
</template>

<script lang="ts">
import {
  GlNewDropdownItem,
  GlNewDropdown,
  GlSearchBoxByType,
  GlIcon,
  GlLoadingIcon,
} from "@gitlab/ui";

import { BBreadcrumbItem, BBreadcrumb } from "bootstrap-vue";
import { Component, Emit, Prop, Vue } from "vue-property-decorator";
@Component({
  components: {
    BBreadcrumb,
    BBreadcrumbItem,
    GlNewDropdown,
    GlSearchBoxByType,
    GlNewDropdownItem,
    GlIcon,
    GlLoadingIcon,
  },
})
export default class SubHeader extends Vue {
  @Prop(Boolean) hideRefresh: boolean | undefined;
  @Prop(Boolean) loading: boolean | undefined;

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

  @Emit("refresh")
  refresh() {
    return true;
  }

  sectionSearchTerm = "";
  sections = [
    { name: "Network", link: "#/network" },
    { name: "EC2", link: "#/ec2" },
    { name: "Messages", link: "#/messages" },
  ];

  subsectionSearchTerm = "";
  subsections = {
    Network: [
      { name: "VPCs", link: "#/network/vpcs" },
      { name: "Subnets", link: "#/network/subnets" },
      { name: "Internet Gateways", link: "#/network/igws" },
      { name: "Nat Gateways", link: "#/network/nats" },
      { name: "Route Tables", link: "#/network/routeTables" },
      { name: "Elastic IPs", link: "#/network/eips" },
      { name: "Security Groups", link: "#/network/securityGroups" },
    ],
    EC2: [{ name: "Instances", link: "#/ec2/instances" }],
    Messages: [
      { name: "SNS Topics", link: "#/messages/sns_topics" },
      { name: "SNS Subscriptions", link: "#/messages/sns_subscriptions" },
      { name: "SQS", link: "#/messages/sqs" },
    ],
  };

  get filteredSections() {
    const lowerCasedSearchTerm = this.sectionSearchTerm.toLowerCase();
    return this.sections.filter((resultString) =>
      resultString["name"].toLowerCase().includes(lowerCasedSearchTerm)
    );
  }

  get filteredSubsections() {
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

<style scoped></style>
