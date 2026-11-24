import { defineConfig } from "vite";
import { nitro } from "nitro/vite";

import { solidStart } from "@solidjs/start/config";
import netlify from "@netlify/vite-plugin";

export default defineConfig({
  plugins: [
    solidStart(),
    nitro(),
    netlify({
      build: {
        enabled: true
      }
    })
  ]
});
