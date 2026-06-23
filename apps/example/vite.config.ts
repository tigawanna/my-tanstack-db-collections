import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { fileURLToPath, URL } from "url";
import { defineConfig } from "vite-plus";

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
    noExternal: ["event-sourced-collection"],
  },
  plugins: [
    nitro(),
    tailwindcss(),
    tanstackStart({
      router: {
        routeToken: "layout",
      },
    }),
    viteReact(),
  ],
});
