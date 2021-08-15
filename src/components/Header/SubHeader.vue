<template>
  <div class="row justify-content-between mr-0">
    <b-breadcrumb class="gl-breadcrumb-list col-8 ml-5 mt-1">
      <img
        class="gl-breadcrumb-avatar-tile"
        src="/assets/aws-icons/AWS-Cloud-alt_light-bg.svg"
        width="15"
        height="15"
        alt="logo-aws"
      />
      <b-breadcrumb-item href="/#/home" class="gl-breadcrumb-item">
        All resources
      </b-breadcrumb-item>

      <!-- We set the breadcrumb to active so it doesn't create a <Link> element which would interfere with the search box -->
      <b-breadcrumb-item class="gl-breadcrumb-item" active>
        <gl-dropdown :text="selectedSection || 'Select a section'" size="small">
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
        </gl-dropdown>
      </b-breadcrumb-item>

      <!-- We set the breadcrumb to active so it doesn't create a <Link> element which would interfere with the search box -->
      <b-breadcrumb-item
        v-if="selectedSection"
        class="gl-breadcrumb-item"
        active
      >
        <gl-dropdown
          key="subsections"
          :text="selectedSubsection || 'Select a subsection'"
          size="small"
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
        </gl-dropdown>
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
  GlDropdownItem,
  GlDropdown,
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
    GlDropdown,
    GlSearchBoxByType,
    GlDropdownItem,
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
export default class SubHeader extends DaintreeComponent {}
</script>
