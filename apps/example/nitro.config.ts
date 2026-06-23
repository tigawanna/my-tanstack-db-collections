import { defineConfig } from "nitro";
import evlog from "evlog/nitro/v3";

export default defineConfig({
  experimental: {
    asyncContext: true,
  },
  plugins: ["./server/plugins/evlog-drain.ts"],
  modules: [
    evlog({
      env: { service: "event-sourced-db-example" },
      include: ["/api/**"],
    }),
  ],
});
