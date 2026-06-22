import { createFileRoute } from "@tanstack/react-router";
import syncApp from "@/server/sync/hono-app";

async function handle({ request }: { request: Request }) {
  return syncApp.fetch(request);
}

export const Route = createFileRoute("/api/sync/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
    },
  },
});
