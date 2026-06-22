import { defineConfig } from '@tanstack/react-start/config'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  vite: {
    plugins: [
      TanStackRouterVite({
        autoCodeSplitting: true,
        routesDirectory: './app/routes',
        generatedRouteTree: './app/routeTree.gen.ts',
      }),
      tailwindcss(),
    ],
  },
  server: {
    preset: 'node-server',
  },
})
