import { createFileRoute } from "@tanstack/react-router";
import type { OutboundEvent } from "event-sourced-collection";
import { createError, type RequestLogger } from "evlog";
import { useRequest } from "nitro/context";

import { remotePullEvents, remotePushEvents } from "@/server/sync/remote";

function getRequestLog(): RequestLogger | undefined {
  try {
    return useRequest().context?.log as RequestLogger | undefined;
  } catch {
    return undefined;
  }
}

export const Route = createFileRoute("/api/sync/events")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const log = getRequestLog();

        // Read the client's last seen globalSeq from ?since=
        const since = Number.parseInt(new URL(request.url).searchParams.get("since") ?? "0", 10);
        const cursor = Number.isNaN(since) ? 0 : since;

        log?.set({ sync: { operation: "pull", since: cursor } });

        // Fetch events newer than the cursor from server SQLite
        const result = await remotePullEvents(cursor);

        log?.set({
          sync: {
            operation: "pull",
            since: cursor,
            returned: result.events.length,
            hasMore: result.hasMore,
            cursor: result.cursor,
          },
        });

        // Client replays these events into local collections
        return Response.json(result);
      },
      POST: async ({ request }) => {
        const log = getRequestLog();

        const incoming = (await request.json()) as unknown;

        if (!Array.isArray(incoming)) {
          log?.set({ sync: { operation: "push", rejected: true, reason: "invalid_body" } });
          throw createError({
            message: "Expected an array of events",
            status: 400,
            why: "The sync push endpoint accepts a JSON array of outbound events",
            fix: "Send a POST body shaped as OutboundEvent[]",
          });
        }

        const events = incoming as OutboundEvent[];

        log?.set({
          sync: {
            operation: "push",
            incomingCount: events.length,
            collectionIds: [...new Set(events.map((event) => event.collectionId))],
          },
        });

        // Persist to server SQLite; duplicates are skipped by eventId
        const confirmed = await remotePushEvents(events);

        log?.set({
          sync: {
            operation: "push",
            incomingCount: events.length,
            confirmedCount: confirmed.length,
          },
        });

        // Client marks events synced using the returned globalSeq values
        return Response.json({ confirmed });
      },
    },
  },
});
