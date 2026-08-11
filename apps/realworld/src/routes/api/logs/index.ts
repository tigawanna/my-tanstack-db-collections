import { createFileRoute } from "@tanstack/react-router";
import { createError } from "evlog";

import { listEvlogDates, readEvlogEvents } from "@/server/logs/read-evlog";

export const Route = createFileRoute("/api/logs/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (process.env.NODE_ENV === "production") {
          throw createError({
            message: "Log viewer is disabled in production",
            status: 404,
            why: "This endpoint reads log files from the local filesystem",
            fix: "Use the evlog file drain output or an external observability tool in production",
          });
        }

        const url = new URL(request.url);
        const listDates = url.searchParams.get("listDates") === "1";

        if (listDates) {
          const dates = await listEvlogDates();
          return Response.json({ dates });
        }

        const date = url.searchParams.get("date") ?? undefined;
        const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
        const pageSize = Number.parseInt(url.searchParams.get("pageSize") ?? "20", 10);

        const result = await readEvlogEvents({
          date,
          page: Number.isNaN(page) ? 1 : page,
          pageSize: Number.isNaN(pageSize) ? 20 : pageSize,
        });

        return Response.json(result);
      },
    },
  },
});
