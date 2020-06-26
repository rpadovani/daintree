<template>
  <section class="gl-banner">
    <img
      src="/assets/undraw_page_not_found_su7k.svg"
      alt="Daintree"
      role="presentation"
    />
    <div class="gl-banner-content">
      <h1>Page not found!</h1>
      <p class="mt-2">
        Uh-oh, this page doesn't exist! If you arrived here clicking on the
        console somewhere, please report a bug. Otherwise, go back or return to
        the home.
      </p>

      <div class="row justify-content-center">
        <gl-button-group>
          <gl-button variant="info" category="secondary" @click="goBack"
            >Go back
          </gl-button>
          <gl-button category="secondary" to="/">Return to home</gl-button>
          <gl-button to="/contribute" variant="success"
            >Report a bug
          </gl-button>
        </gl-button-group>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { GlButton, GlButtonGroup } from "@gitlab/ui";

@Component({ components: { GlButton, GlButtonGroup } })
export default class NotFound extends Vue {
  goBack() {
    this.$router.go(-1);
  }
}
</script>
