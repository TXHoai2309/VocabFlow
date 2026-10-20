import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@vocabflow/contracts": fileURLToPath(new URL("./packages/contracts/src/index.ts", import.meta.url)),
      "@vocabflow/learning-domain": fileURLToPath(new URL("./packages/learning-domain/src/index.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "node_modules", "e2e", ".vocabflow-local/**"]
  }
});
