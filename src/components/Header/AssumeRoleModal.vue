<template>
  <gl-modal
    modal-id="assume-role-modal-id"
    title="Switch role"
    no-fade
    ref="modal"
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

    <template #modal-footer>
      <gl-button class="js-modal-action-secondary" @click="cancel"
        >Cancel</gl-button
      >
      <gl-button
        class="js-modal-action-primary"
        variant="success"
        :disabled="buttonDisabled"
        @click="save"
        >Assume role</gl-button
      >
    </template>
  </gl-modal>
</template>

<script lang="ts">
import {
  GlModal,
  GlFormInputGroup,
  GlIcon,
  GlAlert,
  GlButton,
} from "@gitlab/ui";
import { Component, Vue } from "vue-property-decorator";
import { BInputGroupText } from "bootstrap-vue";
import { Role } from "@/store/sts/state";

@Component({
  components: {
    BInputGroupText,
    GlModal,
    GlFormInputGroup,
    GlIcon,
    GlAlert,
    GlButton,
  },
})
export default class AssumeRoleModal extends Vue {
  accountID = "";
  role = "";
  nickname = "";

  error = "";

  get buttonDisabled(): boolean {
    return this.accountID === "" || this.role === "";
  }

  save() {
    const role: Role = {
      accountId: this.accountID,
      nickname: this.nickname,
      role: this.role,
    };

    this.$store
      .dispatch("sts/assumeRole", { ...role, newRole: true })
      .then(() => {
        //Clean for the next time we assume a role:
        this.accountID = this.nickname = this.role = "";
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        //@ts-ignore
        this.$refs.modal.ok();
      })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .catch(() => {});
  }

  cancel() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    //@ts-ignore
    this.$refs.modal.cancel();
  }
}
</script>

<style scoped></style>
