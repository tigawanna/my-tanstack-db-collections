import type {
  OutboundEvent,
  PullResponse,
  PushConfirmation,
  ServerEvent,
} from "@tanstack-db-collections/event-sourced";
import { asc, eq, gt } from "drizzle-orm";
import { getSyncDb, withSyncSchema } from "./db";
import { syncEvents } from "./schema";

const PULL_LIMIT = 500;

/**
 * Persists outbound client events to the remote sync store and returns server-assigned sequence numbers.
 *
 * Used by `POST /api/sync/events` in `hono-app.ts`. Each event is inserted into
 * `sync_events` via Drizzle. Duplicate `eventId` values are ignored (idempotent retries)
 * and the existing `globalSeq` is returned instead.
 *
 * @param events - Client-originated mutation events from the event-sourced collection sync transport
 * @returns Confirmations pairing each `eventId` with its assigned or existing `globalSeq`
 *
 * @example
 * ```ts
 * const confirmed = await remotePushEvents([
 *   {
 *     eventId: "01H...",
 *     collectionId: "notes",
 *     type: "insert",
 *     key: "note-1",
 *     payload: { title: "Hello" },
 *     timestamp: Date.now(),
 *   },
 * ]);
 * // [{ eventId: "01H...", globalSeq: 42 }]
 * ```
 */
export async function remotePushEvents(
  events: ReadonlyArray<OutboundEvent>,
): Promise<PushConfirmation[]> {
  if (events.length === 0) {
    return [];
  }

  return withSyncSchema(async () => {
    const db = getSyncDb();
    const confirmed: PushConfirmation[] = [];

    for (const event of events) {
      const existing = await db
        .select({ globalSeq: syncEvents.globalSeq })
        .from(syncEvents)
        .where(eq(syncEvents.eventId, event.eventId))
        .limit(1);

      if (existing.length > 0) {
        confirmed.push({
          eventId: event.eventId,
          globalSeq: existing[0]!.globalSeq,
        });
        continue;
      }

      const inserted = await db
        .insert(syncEvents)
        .values({
          eventId: event.eventId,
          collectionId: event.collectionId,
          type: event.type,
          key: String(event.key),
          payload: JSON.stringify(event.payload),
          clientTimestamp: event.timestamp,
        })
        .returning({ globalSeq: syncEvents.globalSeq });

      confirmed.push({
        eventId: event.eventId,
        globalSeq: inserted[0]!.globalSeq,
      });
    }

    return confirmed;
  });
}

/**
 * Fetches server events newer than a global sequence cursor for client replay.
 *
 * Used by `GET /api/sync/events?since=<n>` in `hono-app.ts`. Returns up to 500 rows
 * ordered by `globalSeq`, with `hasMore` set when the batch is full so the client can
 * page forward using the returned `cursor`.
 *
 * @param since - Last seen `globalSeq`; only events with a higher sequence are returned
 * @returns Pulled events, the latest cursor, and whether more pages may exist
 *
 * @example
 * ```ts
 * const { events, cursor, hasMore } = await remotePullEvents(0);
 *
 * for (const event of events) {
 *   applyServerEvent(event);
 * }
 *
 * if (hasMore) {
 *   await remotePullEvents(Number(cursor));
 * }
 * ```
 */
export async function remotePullEvents(since: number): Promise<PullResponse> {
  return withSyncSchema(async () => {
    const db = getSyncDb();

    const rows = await db
      .select()
      .from(syncEvents)
      .where(gt(syncEvents.globalSeq, since))
      .orderBy(asc(syncEvents.globalSeq))
      .limit(PULL_LIMIT);

    const events: ServerEvent[] = rows.map((row) => ({
      globalSeq: row.globalSeq,
      eventId: row.eventId,
      collectionId: row.collectionId,
      type: row.type as ServerEvent["type"],
      key: row.key,
      payload: JSON.parse(row.payload) as Record<string, unknown>,
      timestamp: row.clientTimestamp,
      cursor: String(row.globalSeq),
    }));

    const cursor = events.length > 0 ? events[events.length - 1]!.cursor : String(since);

    return {
      events,
      cursor,
      hasMore: events.length === PULL_LIMIT,
    };
  });
}
