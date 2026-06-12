import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// https://vitejs.dev/config/
// GHPAGES=1 builds for the GitHub Pages project URL (served from a subfolder);
// without it, base stays "/" for local dev, the static tunnel, and the final
// custom-domain deploy.
export default defineConfig({
  base: process.env.GHPAGES ? "/lev-hatahbiv/" : "/",
  plugins: [preact()],
  build: {
    target: "chrome70",
  },
});
