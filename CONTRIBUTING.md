Thanks for being interested in contributing to Daintree!

The whole code is in Vue.JS + Typescript, and we use [Gitlab UI](https://gitlab.com/gitlab-org/gitlab-ui) as library
for the components, which is based on [BootstrapVue](https://bootstrap-vue.org/).

Before working on something, check if there is already an issue open, otherwise create one, so you are sure nobody else
is working on the same thing!

We do not use Vuex to store AWS data, if not strictly necessary: we don't want to cache data, we try to keep them fresh.
Every AWS component lives in its own directory, with also all its routes.
Also, we use lazy loading routes to split the Javascript files, to do not have one huge blob.

You can take existing components as example.

Of course if you have any suggestion on how to improve the general structure of the code, open an issue and let's talk
about it :-)

If you have any question, or you are not sure how to start, write to rpadovani@daintree.app, he will gladly help!

### Project setup
```
yarn install
```

#### Compiles and hot-reloads for development
```
yarn serve
```

#### Compiles and minifies for production
```
yarn build
```

#### Lints and fixes files
```
yarn lint
```

#### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

#### Building and running in docker
Execute these commands to have this project built inside a container

```
docker build -t daintree:latest .

docker run -it -p 8080:80 --rm --name daintree-1 daintree:latest
```
