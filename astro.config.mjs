// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: "https://shouldirun.today",
  integrations: [sitemap({ filter: (page) => !page.includes("/embed") }), react()],

  fonts: [
    {
      provider: fontProviders.google(),
      name: "Barlow Condensed",
      cssVariable: "--font-display",
      weights: [600, 700, 800],
      styles: ["normal"],
    },
    {
      provider: fontProviders.google(),
      name: "Barlow",
      cssVariable: "--font-body",
      weights: [400, 500, 600, 700],
      styles: ["normal"],
    },
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: cloudflare(),
});
