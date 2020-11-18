/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    public: "/",
    src: "/_dist_",
  },
  plugins: [
    "@snowpack/plugin-react-refresh",
    "@snowpack/plugin-typescript",
    "@snowpack/plugin-optimize",
    "@snowpack/plugin-webpack"
  ],
  installOptions: {
    polyfillNode: false,
    rollup: {
      plugins: [require("rollup-plugin-node-polyfills")({ buffer: true })],
    },
  },
  devOptions: {
    open: "none",
  },
};
