import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  site: "https://kellidoscope.com",
  output: "static",
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
  ],
  build: {
    format: "directory",
  },
});
