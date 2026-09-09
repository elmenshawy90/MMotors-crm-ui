import { defineConfig } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    TanStackRouterVite(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    outDir: "dist",
  },
});
