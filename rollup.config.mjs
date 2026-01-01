import typescript from "@rollup/plugin-typescript";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

const isWatching = !!process.env.ROLLUP_WATCH;
const sdPlugin = "com.ecoflow.control-deck.sdPlugin";

export default {
  input: "src/plugin.ts",
  output: {
    file: `${sdPlugin}/bin/plugin.js`,
    format: "es",
    sourcemap: isWatching,
    inlineDynamicImports: true,
  },
  external: [],
  plugins: [
    nodeResolve({
      browser: false,
      preferBuiltins: true,
      exportConditions: ["node"],
    }),
    commonjs(),
    json(),
    typescript({
      tsconfig: "tsconfig.json",
      mapRoot: isWatching ? "./" : undefined,
    }),
  ],
};
