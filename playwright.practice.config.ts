import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({ ...base,
  outputDir: ".scratch/practice-game-video-20261101/evidence/playwright",
  use: { ...base.use, baseURL: "http://127.0.0.1:43172" },
  webServer: {
    command: "node node_modules/vite/bin/vite.js preview --config apps/web/vite.config.mts --host 127.0.0.1 --port 43172 --strictPort",
    url: "http://127.0.0.1:43172", reuseExistingServer: false, timeout: 30000
  }
});
