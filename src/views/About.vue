<template>
  <div>
    <Header hide-sub-header />

    <div class="container">
      <section class="gl-banner">
        <div class="gl-banner-content">
          <h4 class="mt-2">About Daintree</h4>

          <p>
            The AWS Console is an amazing piece of software: it has hundreds of
            thousands of features, it is reliable, and it is the front end of an
            incredible world. However, as any software, it is not perfect:
            sometimes is a bit slow, so many features can be confusing, and it
            is clear that it has evolved over time, so there are a lot of
            different styles, and if it would be made from scratch today, some
            choices would probably be different.
          </p>

          <p>
            Daintree has born wanting to fix one particular problem of the AWS
            Console: the impossibility to see resources from multiple regions in
            the same view. Please consider the Daintree's project start in the
            April 2020, so it is still quite young: a lot of feature are
            missing, and if you like,
            <router-link to="/contribute"
              >you can contribute to its development.</router-link
            >
          </p>

          <div class="row mt-2 p-2">
            <div class="col-6">
              <img
                class="col-12"
                src="/assets/features/multiple-regions.gif"
                alt="Regions selector"
              />
            </div>
            <div class="col-6">
              <h5>Multiple region support</h5>
              <p>
                The main reason Daintree exists is to display resources from
                multiple regions in the same screen: why limiting to one, when
                you can have 25?
              </p>

              <p>
                Also, changing enabled regions doesn't require a full page
                reload, but just a click on a flag: Daintree will smartly
                require resources from the freshly enabled regions.
              </p>
            </div>
          </div>

          <div class="row mt-2 p-2">
            <div class="col-6">
              <h5>Fast role switching</h5>
              <p>
                If you belong to an AWS organization, and you have multiple
                accounts, you probably switch often role: such operation on the
                original AWS console requires a full page reload, and it always
                brings you to the homepage.
              </p>

              <p>
                On Daintree, changing roles will only reload the resources in
                the page you are currently in, without having to wait for a full
                page reload!
              </p>
            </div>
            <div class="col-6">
              <img
                class="col-12"
                src="/assets/features/switch-role.gif"
                alt="Role selector"
              />
            </div>
          </div>

          <div class="row mt-2 p-2">
            <div class="col-6">
              <img
                style="max-height: 200px"
                src="/assets/undraw_visualization_c2ps.svg"
                alt="Cool"
                class="mx-auto d-block"
              />
            </div>
            <div class="col-6">
              <h5>Coherent interface</h5>
              <p>
                Beauty is in the eye of the beholder, so claiming Daintree is
                more beautiful than the original console would be silly:
                however, Daintree has been built to be coherent: all the styling
                is made thanks to the
                <a
                  href="https://gitlab.com/gitlab-org/gitlab-ui"
                  target="_blank"
                  >Gitlab UI project <gl-icon name="external-link"/></a
                >, and the illustrations are made by Katerina Limpitsouni from
                <a href="https://undraw.co/" target="_blank"
                  >unDraw
                  <gl-icon name="external-link" />
                  .</a
                >
              </p>
              <p>
                This guarantees a coherent and polished experience all over the
                application.
              </p>
            </div>
          </div>

          <div class="row mt-2 p-2">
            <div class="col-6">
              <h5>Free software</h5>
              <p>
                Daintree is licensed under AGPL-3.0, meaning is truly free
                software: this way, everyone can contribute improving the
                experience of using it. The full source code is available over
                <a href="https://gitlab.com/rpadovani/daintree" target="_blank"
                  >Gitlab <gl-icon name="external-link" /> </a
                >.
              </p>

              <p>
                The project doesn't have any commercial goal, and as explained
                in
                <router-link to="/security">the security page</router-link>, no
                trackers are present on the website. To help Daintree, you
                <router-link to="/contribute">can contribute</router-link> and
                spread the word!
              </p>
            </div>
            <div class="col-6">
              <img
                alt="AGPLv3"
                src="/assets/agplv3-with-text-162x68.png"
                width="162px"
                height="68px"
                class="mx-auto d-block"
              />
            </div>
          </div>

          <div class="row mt-2 p-2">
            <img
              style="max-height: 200px"
              class="col-6"
              src="/assets/undraw_fast_loading_0lbh.svg"
              alt="Fast loading"
            />
            <div class="col-6">
              <h5>Fast navigation</h5>
              <p>
                Daintree heavily uses Javascript (with Vue.js) to do not have to
                reload the page: also, it tries to perform as less operations as
                possible to keep always updated on your resources. In this way,
                you don't waste your precious time waiting for the page to load.
              </p>
            </div>
          </div>

          <div class="row mt-2 p-2">
            <div class="col-6">
              <h5>And much more!</h5>
              <p>
                While implementing Daintree, new features have been introduced
                to make life easier to whoever uses it. As an example, you can
                create Internet Gateway and attach them to a VPC in the same
                screen, without having to wait for the gateway to be created.
                Or, while visualizing a security groups, you can click on the
                linked security groups, without having to look for them or
                remember complicated IDs. If you have any idea on how to improve
                workflows,
                <router-link to="/contribute"
                  >please share it with developers</router-link
                >!
              </p>
            </div>
            <div class="col-6">
              <img
                style="max-height: 200px"
                src="/assets/undraw_To_the_stars_qhyy.svg"
                alt="To the stars!"
                class="mx-auto d-block"
              />
            </div>
          </div>

          <h5>Supported components</h5>
          <p>
            Daintree is still at early stages of development, so the number of
            supported resources is quite limited.
            <router-link to="/contribute"
              >You can report which feature you'd like to see to the developers,
              or you can implement them!</router-link
            >
          </p>
          <p>
            Daintree allows to view VPCs, Subnets, Internet Gateways, Nat
            Gateways, Route Tables, Elastic IPs, Security Groups, Instances,
            SNS, and SQS. You can also create, delete, and edit some of these
            resources. Development is ongoing, so remember to check the
            <router-link to="/changelog">changelog</router-link> from time to
            time.
          </p>

          <div class="row justify-content-center">
            <gl-button-group>
              <gl-button category="secondary" to="/security"
                >What about security?</gl-button
              >
              <gl-button to="/login" variant="success">Login</gl-button>
            </gl-button-group>
          </div>

          <p class="mt-2">
            This website is not affiliated to Amazon, or AWS, or any of their
            subsidiaries. All trademarks registered.
          </p>
        </div>
      </section>
    </div>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import Header from "@/components/Header/Header.vue";
import { GlButton, GlButtonGroup, GlIcon } from "@gitlab/ui";

@Component({ components: { Header, GlButton, GlButtonGroup, GlIcon } })
export default class About extends Vue {}
</script>
