<template>
  <gl-modal
    modal-id="assume-role-modal-id"
    title="Switch role"
    no-fade
    ref="modal"
    :action-primary="primaryProps"
    :action-cancel="cancelProps"
    @primary="save"
  >
    <gl-alert
      variant="danger"
      v-if="error.length > 0"
      @dismiss="() => (error = '')"
    >
      {{ error }}
    </gl-alert>
    Allows management of resources across AWS accounts using a single user ID
    and password. You can switch roles after an AWS administrator has configured
    a role and given you the account and role details.
    <a
      href="https://docs.aws.amazon.com/console/iam/roles-switchrole-console-howtoswitch"
      target="_blank"
    >
      Learn more<gl-icon name="external-link" /> </a
    >.
    <gl-form-input-group
      class="mt-3"
      v-model="accountID"
      placeholder="Type the 12 digit account number or the alias of the account in which the role exists."
    >
      <template #prepend>
        <b-input-group-text>Account ID</b-input-group-text>
      </template>
    </gl-form-input-group>
    <gl-form-input-group
      class="mt-3"
      v-model="role"
      placeholder="Type the name of the role that will be used."
    >
      <template #prepend>
        <b-input-group-text>Role</b-input-group-text>
      </template>
    </gl-form-input-group>
    <gl-form-input-group
      class="mt-3"
      v-model="nickname"
      placeholder="Optionally, type the nickname that will appear in the dropdown menu."
    >
      <template #prepend>
        <b-input-group-text>Nickname</b-input-group-text>
      </template>
    </gl-form-input-group>

    <gl-form-checkbox class="mt-2" v-model="remember"
      >Remember this role</gl-form-checkbox
    >
  </gl-modal>
</template>

<script lang="ts">
import {
  GlModal,
  GlFormInputGroup,
  GlIcon,
  GlAlert,
  GlButton,
  GlFormCheckbox,
} from "@gitlab/ui";
import { Component, Vue } from "vue-property-decorator";
import { BInputGroupText } from "bootstrap-vue";
import { Role } from "@/store/sts/state";

@Component({
  components: {
    BInputGroupText,
    GlModal,
    GlFormInputGroup,
    GlFormCheckbox,
    GlIcon,
    GlAlert,
    GlButton,
  },
})
export default class AssumeRoleModal extends Vue {
  accountID = "";
  role = "";
  nickname = "";
  remember = false;

  error = "";

  get primaryProps() {
    return {
      text: "Assume role",
      attributes: [
        { disabled: this.accountID === "" || this.role === "" },
        { variant: "success" },
      ],
    };
  }

  get cancelProps() {
    return {
      text: "Close",
    };
  }

  save() {
    const role: Role = {
      accountId: this.accountID,
      nickname: this.nickname,
      role: this.role,
    };

    this.$store
      .dispatch("sts/assumeRole", {
        ...role,
        newRole: true,
        remember: this.remember,
      })
      .then(() => {
        //Clean for the next time we assume a role:
        this.accountID = this.nickname = this.role = "";
        this.remember = false;
      })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .catch(() => {});
  }
}
</script>

<style scoped></style>
