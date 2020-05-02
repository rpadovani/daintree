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
    <gl-form-checkbox-group
      v-model="selectedRegions"
      class="mx-auto"
      style="width: 700px;"
    >
      <div
        class="row auto-ml mt-2"
        v-for="n in Math.floor(this.regionsOptions.length / 2)"
        :key="n"
      >
        <div
          class="col-6"
          :key="r.value"
          v-for="r in regionsOptions.slice(
            Math.floor((n - 1) * 2),
            Math.floor((n - 1) * 2) + 2
          )"
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
  allRegionsOptions = [
    { text: "US East (N. Virginia)", value: "us-east-1" },
    { text: "US East (Ohio)", value: "us-east-2" },
    { text: "US West (N. California)", value: "us-west-1" },
    { text: "US West (Oregon)", value: "us-west-2" },

    { text: "Africa (Cape Town)", value: "af-south-1" },

    { text: "Asia Pacific (Hong Kong)", value: "ap-east-1" },
    { text: "Asia Pacific (Mumbai)", value: "ap-south-1" },
    { text: "Asia Pacific (Tokyo)", value: "ap-northeast-1" },
    { text: "Asia Pacific (Seoul)", value: "ap-northeast-2" },
    { text: "Asia Pacific (Osaka)", value: "ap-northeast-3" },
    { text: "Asia Pacific (Singapore)", value: "ap-southeast-1" },
    { text: "Asia Pacific (Sydney)", value: "ap-southeast-2" },

    { text: "Canada (Central)", value: "ca-central-1" },

    { text: "China (Beijing)", value: "cn-north-1" },
    { text: "China (Ningxia)", value: "cn-northwest-1" },

    { text: "Europe (Frankfurt)", value: "eu-central-1" },
    { text: "Europe (Ireland)", value: "eu-west-1" },
    { text: "Europe (London)", value: "eu-west-2" },
    { text: "Europe (Paris)", value: "eu-west-3" },
    { text: "Europe (Stockholm)", value: "eu-north-1" },
    { text: "Europe (Milan)", value: "eu-south-1" },

    { text: "Middle East (Bahrain)", value: "me-south-1" },
    { text: "South America (São Paulo)", value: "sa-east-1" },

    { text: "GovCloud (US-East) - us-gov-east-1", value: "us-gov-east-1" },
    { text: "GovCloud (US-West) - us-gov-west-1", value: "us-gov-west-1" },
  ];

  get regionsOptions() {
    //If, for any reason, we weren't able to download any region, we show them all
    if (this.enabledRegions.length < 1) {
      return this.allRegionsOptions;
    }
    return this.allRegionsOptions.filter((r) =>
      this.enabledRegions.includes(r.value)
    );
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
