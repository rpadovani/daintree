// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("path");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PrerenderSPAPlugin = require("prerender-spa-plugin");

process.env.VUE_APP_VERSION = require("./package.json").version;

module.exports = {
  transpileDependencies: ["@gitlab/ui"],
  configureWebpack: {
    plugins: [
      new PrerenderSPAPlugin({
        // Required - The path to the webpack-outputted app to prerender.
        staticDir: path.join(__dirname, "dist"),
        // Required - Routes to render.
        routes: ["/"],
      }),
    ],
  },
};
