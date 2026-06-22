import { defineConfig } from "vite-plus";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "url";

export default defineConfig({
  staged: { "*": "vp check --fix" },
  server: {
    port: 3002,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    tsconfigPaths: true,
  },
  ssr: {
    noExternal: ["@tanstack-db-collections/event-sourced"],
  },
  plugins: [nitro(), tailwindcss(), tanstackStart(), viteReact()],
});
