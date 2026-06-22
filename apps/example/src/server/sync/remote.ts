import type {
  OutboundEvent,
  PullResponse,
  PushConfirmation,
  ServerEvent,
} from "@tanstack-db-collections/event-sourced";
import { getSyncTursoClient, initSyncSchema } from "./turso";

type SyncEventRow = {
  global_seq: number;
  event_id: string;
  collection_id: string;
  type: string;
  key: string;
  payload: string;
  client_timestamp: number;
};

let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = initSyncSchema();
  }
  await schemaReady;
}

export async function remotePushEvents(
  events: ReadonlyArray<OutboundEvent>,
): Promise<PushConfirmation[]> {
  if (events.length === 0) {
    return [];
  }

  await ensureSchema();
  const db = getSyncTursoClient();
  const confirmed: PushConfirmation[] = [];

  for (const event of events) {
    const existing = await db.execute({
      sql: `SELECT global_seq FROM sync_events WHERE event_id = ?`,
      args: [event.eventId],
    });

    if (existing.rows.length > 0) {
      const row = existing.rows[0] as unknown as { global_seq: number };
      confirmed.push({ eventId: event.eventId, globalSeq: Number(row.global_seq) });
      continue;
    }

    const inserted = await db.execute({
      sql: `INSERT INTO sync_events (event_id, collection_id, type, key, payload, client_timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
            RETURNING global_seq`,
      args: [
        event.eventId,
        event.collectionId,
        event.type,
        String(event.key),
        JSON.stringify(event.payload),
        event.timestamp,
      ],
    });

    const globalSeq = Number((inserted.rows[0] as unknown as { global_seq: number }).global_seq);
    confirmed.push({ eventId: event.eventId, globalSeq });
  }

  return confirmed;
}

export async function remotePullEvents(since: number): Promise<PullResponse> {
  await ensureSchema();
  const db = getSyncTursoClient();
  const limit = 500;

  const result = await db.execute({
    sql: `SELECT global_seq, event_id, collection_id, type, key, payload, client_timestamp
          FROM sync_events
          WHERE global_seq > ?
          ORDER BY global_seq ASC
          LIMIT ?`,
    args: [since, limit],
  });

  const events: ServerEvent[] = result.rows.map((row) => {
    const typed = row as unknown as SyncEventRow;
    return {
      globalSeq: Number(typed.global_seq),
      eventId: String(typed.event_id),
      collectionId: String(typed.collection_id),
      type: typed.type as ServerEvent["type"],
      key: String(typed.key),
      payload: JSON.parse(String(typed.payload)) as Record<string, unknown>,
      timestamp: Number(typed.client_timestamp),
      cursor: String(typed.global_seq),
    };
  });

  const cursor = events.length > 0 ? events[events.length - 1]!.cursor : String(since);

  return {
    events,
    cursor,
    hasMore: events.length === limit,
  };
}
