<template>
  <div class="container">
    <section class="gl-banner">
      <div class="gl-banner-illustration">
        <img
          src="/assets/undraw_tasks_av87.svg"
          alt="Instructions"
          role="presentation"
        />
      </div>
      <div class="gl-banner-content">
        <h1 class="gl-banner-title">Host Daintree on your server!</h1>
        <p>
          Would you like to self-host Daintree under your own domain? You are
          totally free to do so, and it's quite an easy process! Just remember:
          Daintree is licensed under
          <router-link to="https://www.gnu.org/licenses/agpl-3.0.en.html"
            >AGPLv3</router-link
          >: basically, you are free to do whatever you want with the code, as
          long as you share your changes under the same license and keep the
          copyright notice.
        </p>
        <p>
          Daintree is just a collection of static files, written in Javascript,
          HTML, and CSS: they are built from a source code written in
          Typescript, and some other web technologies. This means, you only need
          some storage and a webserver to use Daintree: this website is hosted
          on
          <a
            href="https://docs.gitlab.com/ee/user/project/pages/"
            target="_blank"
            >Gitlab Pages <gl-icon name="external-link"
          /></a>
          with
          <a href="https://www.cloudflare.com/" target="_blank"
            >Cloudflare <gl-icon name="external-link"
          /></a>
          acting as CDN, but you can pick the stack you prefer.
        </p>

        <h6>Use the provided packages</h6>
        <p>
          The easiest way to obtain Daintree is downloading the latest version
          of the built code from the
          <a href="https://gitlab.com/rpadovani/daintree" target="_blank"
            >project over Gitlab <gl-icon name="external-link" /></a
          >. Just visit the project page, and click on the top right download
          icon to download data, near the `Clone` button. You need to download
          the artifact called <i>buildPackage</i>. (We are working to simplify
          this procedure!). Or, click
          <a
            href="https://gitlab.com/rpadovani/daintree/-/jobs/artifacts/master/download?job=buildPackage"
            target="_blank"
            >this link <gl-icon name="external-link" /></a
          >, it will prompt you to download the latest version.
        </p>

        <h6>Build from the source code</h6>
        <p>
          If you want to build Daintree from the source code, you need to have
          Git,
          <a href="https://nodejs.org/en/" target="_blank"
            >Node <gl-icon name="external-link" /></a
          >, and
          <a href="https://yarnpkg.com/" target="_blank"
            >Yarn <gl-icon name="external-link"
          /></a>
          installed on your PC. Then, follow these instructions:<br />

          <code>
            # Clone the source code <br />
            git clone https://gitlab.com/rpadovani/daintree.git <br />

            # Enter the directory with the source code <br />
            cd daintree/ <br />

            # Optionally, download the changelog<br />
            curl "https://gitlab.com/api/v4/projects/18158864/releases" >
            public/changelog.json <br />

            # Install the dependencies<br />
            yarn install --pure-lockfile <br />

            # Build the application <br />
            yarn build <br />
          </code>

          At this point, you have a <b>dist/</b> directory: put it behind a
          webserver, and enjoy your own Daintree!
        </p>

        <div class="row justify-content-center">
          <gl-button-group>
            <gl-button variant="info" category="secondary" to="/about"
              >See all features
            </gl-button>
            <gl-button to="/login" variant="success">Login</gl-button>
          </gl-button-group>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import Header from "@/components/Header/Header.vue";
import { GlButton, GlButtonGroup, GlIcon } from "@gitlab/ui";

@Component({ components: { Header, GlButton, GlButtonGroup, GlIcon } })
export default class Security extends Vue {}
</script>
