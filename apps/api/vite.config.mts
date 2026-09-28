import { isAbsolute, resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: resolve("apps/api/src/vercel-runtime.mts"),
      formats: ["es"],
      fileName: "vercel-runtime",
    },
    outDir: "apps/api/dist",
    rollupOptions: {
      external: (id) => !id.startsWith(".") && !isAbsolute(id),
    },
    sourcemap: false,
  },
});
