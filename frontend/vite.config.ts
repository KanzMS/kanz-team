import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/** GitHub Pages serves 404.html for unknown paths, so a copy of the app opens deep links. */
function spaFallback(): Plugin {
  return {
    name: "spa-fallback",
    apply: "build",
    closeBundle() {
      const dist = resolve(import.meta.dirname, "dist");
      copyFileSync(resolve(dist, "index.html"), resolve(dist, "404.html"));
    },
  };
}

export default defineConfig({
  // The repository's name: GitHub Pages serves the site from this subfolder.
  base: "/kanz-team/",
  plugins: [react(), spaFallback()],
  server: {
    port: 5173,
  },
});
