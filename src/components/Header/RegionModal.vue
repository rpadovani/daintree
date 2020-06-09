<template>
  <gl-modal
    modal-id="region-modal-id"
    ref="regionModal"
    title="Select enabled regions"
    no-fade
    :action-primary="primaryProps"
    :action-cancel="cancelProps"
    @primary="save"
  >
    <gl-form-checkbox-group v-model="selectedRegions" class="mx-auto col-12">
      <div class="row">
        <div
          class="col-12 col-md-6 mb-2"
          :key="r.value"
          v-for="r in regionsOptions"
        >
          <b-form-checkbox :value="r.value">
            <div class="row ml-1">
              <RegionText :region="r.value" :compact="true" />
              {{ r.text }} - {{ r.value }}
            </div>
          </b-form-checkbox>
        </div>
      </div>
    </gl-form-checkbox-group>

    <i v-if="enabledRegions.length > 0" class="pt-2 mt-2 mb-0 pb-0">
      <small>
        We display only regions that you have enabled on your AWS account. To
        see how to enable other regions, see
        <a
          href="https://docs.aws.amazon.com/general/latest/gr/rande-manage.html"
          target="_blank"
          >the AWS guide <gl-icon name="external-link"
        /></a> </small
    ></i>

    <i v-if="errorLoading" class="pt-2 mt-2 mb-0 pb-0">
      <small style="color: red;">
        We weren't able to determine which regions you have access to, so we
        show you all of them.
      </small></i
    >
  </gl-modal>
</template>

<script lang="ts">
import {
  GlModal,
  GlModalDirective,
  GlFormCheckboxGroup,
  GlIcon,
} from "@gitlab/ui";
import { Component, Ref, Vue, Watch } from "vue-property-decorator";
import { BFormCheckbox, BvModal } from "bootstrap-vue";
import RegionText from "@/components/common/RegionText.vue";
import EC2Client from "aws-sdk/clients/ec2";
import { isString } from "@/utils/isString";
import { ALL_REGIONS } from "@/components/common/regions";

@Component({
  components: {
    GlModal,
    RegionText,
    GlFormCheckboxGroup,
    BFormCheckbox,
    GlIcon,
  },
  directives: { modal: GlModalDirective },
})
export default class RegionModal extends Vue {
  enabledRegions: string[] = [];
  errorLoading = false;

  selectedRegions = this.$store.getters["sts/regions"];

  get regionsOptions() {
    //If, for any reason, we weren't able to download any region, we show them all
    if (this.enabledRegions.length < 1) {
      return ALL_REGIONS;
    }
    return ALL_REGIONS.filter((r) => this.enabledRegions.includes(r.value));
  }

  get primaryProps() {
    return {
      text: "Save regions",
      attributes: [
        { disabled: this.selectedRegions.length === 0 },
        { variant: "success" },
      ], //Cannot save if no regions have been selected
    };
  }

  get cancelProps() {
    return {
      text: "Close without saving",
      attributes: [{ disabled: this.regions.length === 0 }], //Cannot cancel without regions enabled beforehand
    };
  }

  get isLoggedIn(): boolean {
    return this.$store.getters["sts/isLoggedIn"];
  }

  get regions(): string[] {
    return this.$store.getters["sts/regions"];
  }

  get showModal(): boolean {
    return this.$store.getters["sts/showRegionsModal"];
  }

  get prettyCredentials(): string {
    return this.$store.getters["sts/currentPrettyCredentials"];
  }

  save() {
    this.$store.commit("sts/setEnabledRegions", this.selectedRegions);
  }

  loadEnabledRegions() {
    //The region doesn't really matter here, but it is mandatory
    const EC2 = new EC2Client({
      region: "us-east-1",
      credentials: this.$store.getters["sts/credentials"],
    });
    EC2.describeRegions({}, (err, data) => {
      if (err) {
        this.errorLoading = true;
      } else if (data.Regions) {
        this.errorLoading = false;
        this.enabledRegions = data.Regions.map((r) => r.RegionName).filter(
          isString
        );
      }
    });
  }

  mounted() {
    if (this.isLoggedIn) {
      this.loadEnabledRegions();
    }
  }

  //When user changes role, the enabled regions could differ
  @Watch("prettyCredentials")
  onPrettyCredentialsChanged() {
    if (this.isLoggedIn) {
      this.loadEnabledRegions();
    }
  }

  @Ref("regionModal") readonly regionModal!: BvModal;

  @Watch("showModal")
  onShowModalUpdated(newValue: boolean) {
    //When the user logs in, prompt regions if they have not been selected yet
    if (newValue && this.isLoggedIn && this.regions.length === 0) {
      this.$nextTick().then(() => {
        this.regionModal.show("region-modal-id");
        //This re-enables the guard for another route change
        this.$store.commit("sts/showRegionsModal", false);
      });
    }
  }
}
</script>

<style scoped></style>
