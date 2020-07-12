<template>
  <div class="row justify-content-between mr-0" v-if="isSubHeaderVisible">
    <b-breadcrumb class="gl-breadcrumb-list col-8 ml-5 mt-1">
      <img
        class="gl-breadcrumb-avatar-tile"
        src="/assets/aws-icons/AWS-Cloud-alt_light-bg.svg"
        width="15"
        height="15"
        alt="logo-aws"
      />
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

    <div class="col-3 mt-2 mr-0 pr-3 text-right" v-if="isLoaderVisible">
      <gl-icon
        class="float-right"
        v-if="!isLoading"
        name="retry"
        v-gl-tooltip.hover
        :title="lastRefreshString"
        @click="refresh"
      />
      <gl-loading-icon
        class="float-right"
        v-else
        inline
        v-gl-tooltip.hover
        :title="lastRefreshString"
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
  GlTooltipDirective,
} from "@gitlab/ui";

import { BBreadcrumbItem, BBreadcrumb } from "bootstrap-vue";
import { Component } from "vue-property-decorator";
import { mapGetters } from "vuex";
import { DaintreeComponent } from "@/mixins/DaintreeComponent";
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
  computed: {
    ...mapGetters("header", [
      "isSubHeaderVisible",
      "isLoaderVisible",
      "isLoading",
      "lastRefresh",
    ]),
  },
  directives: {
    "gl-tooltip": GlTooltipDirective,
  },
})
export default class SubHeader extends DaintreeComponent {
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
  isLoading!: boolean;
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
    ],
    EC2: [
      { name: "Instances", link: "#/ec2/instances" },
      { name: "Load Balancers", link: "#/ec2/loadBalancers" },
      { name: "Target groups", link: "#/ec2/targetGroups" },
      { name: "Key pairs", link: "#/ec2/keyPairs" },
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
