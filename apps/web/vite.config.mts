import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "apps/web",
  plugins: [react(), tailwindcss()],
  build: { outDir: "../../dist/client", emptyOutDir: true, sourcemap: false },
  server: { port: 5173 },
  preview: { port: 4173 }
});
