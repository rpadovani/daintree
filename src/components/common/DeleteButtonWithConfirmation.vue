<template>
  <div>
    <gl-modal
      modal-id="confirm-deletion"
      :title="`Delete ${resourceType}`"
      no-fade
      :action-primary="deleteButtonProps"
      :action-cancel="cancelProps"
      @primary="primary"
      @canceled="canceled"
    >
      Are you sure that you want to delete this {{ resourceType }} (<b>{{
        modalText
      }}</b
      >)? <br /><br />
      <span class="gl-text-red-500">This action cannot be undone</span>. To
      continue, please type
      <b
        ><i>{{ resourceNameOrConfirm }}</i></b
      >
      in the box below:

      <gl-form-input
        class="col-12 mt-3"
        id="filter"
        v-model="confirmationBox"
        :placeholder="`Type '${resourceNameOrConfirm}' to delete this ${resourceType}`"
        autocomplete="off"
      />
    </gl-modal>

    <gl-button
      style="height: 100%;"
      variant="danger"
      category="secondary"
      v-gl-modal-directive="'confirm-deletion'"
      >Delete this {{ resourceType }}</gl-button
    >
  </div>
</template>

<script lang="ts">
import { Component, Emit, Prop, Vue } from "vue-property-decorator";
import { GlModal, GlButton, GlModalDirective, GlFormInput } from "@gitlab/ui";

@Component({
  components: {
    GlModal,
    GlButton,
    GlFormInput,
  },
  directives: { "gl-modal-directive": GlModalDirective },
})
export default class DeleteButtonWithConfirmation extends Vue {
  @Prop() readonly resourceType!: string;
  @Prop() readonly resourceId!: string;
  @Prop({ default: "" }) readonly resourceName!: string;

  confirmationBox = "";

  get deleteButtonProps(): {
    text: string;
    attributes: { variant: string; disabled: boolean };
  } {
    return {
      text: `Delete ${this.resourceType}`,
      attributes: {
        variant: "danger",
        disabled: this.resourceNameOrConfirm !== this.confirmationBox,
      },
    };
  }

  cancelProps = {
    text: "Cancel",
  };

  get modalText(): string {
    if (this.resourceName) {
      return `${this.resourceName} - ${this.resourceId}`;
    }

    return `${this.resourceId}`;
  }

  get resourceNameOrConfirm(): string {
    return this.resourceName || "confirm";
  }

  @Emit()
  primary(): void {
    this.confirmationBox = "";
    return;
  }

  canceled(): void {
    this.confirmationBox = "";
  }
}
</script>

<style scoped></style>
