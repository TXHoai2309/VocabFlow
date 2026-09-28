import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: "apps/web",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@vocabflow/contracts": fileURLToPath(new URL("../../packages/contracts/src/index.ts", import.meta.url)),
      "@vocabflow/learning-domain": fileURLToPath(new URL("../../packages/learning-domain/src/index.ts", import.meta.url)),
    },
  },
  build: { outDir: "../../dist/client", emptyOutDir: true, sourcemap: false },
  server: { port: 5173 },
  preview: { port: 4173 }
});
