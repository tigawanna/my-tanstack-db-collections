// app.config.ts
import { defineConfig } from "@tanstack/react-start/config";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
var app_config_default = defineConfig({
  vite: {
    plugins: [
      TanStackRouterVite({
        autoCodeSplitting: true,
        routesDirectory: "./app/routes",
        generatedRouteTree: "./app/routeTree.gen.ts"
      }),
      tailwindcss()
    ]
  },
  server: {
    preset: "node-server"
  }
});
export {
  app_config_default as default
};
