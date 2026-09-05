import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "apps/web",
  plugins: [react(), tailwindcss(), cloudflare({ configPath: "../../wrangler.jsonc" })],
  build: { outDir: "../../dist", emptyOutDir: true },
  server: { port: 5173 },
  preview: { port: 4173 }
});
