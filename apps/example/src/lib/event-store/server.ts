import {
  EventStore,
  generateEventId,
  type OutboundEvent,
  type ServerEvent,
  type StoredEvent,
  type SyncResult,
} from "@tanstack-db-collections/event-sourced";
import { remotePullEvents, remotePushEvents } from "@/server/sync/remote";
import { createLibsqlDriver } from "./libsql-driver";

type EventRow = {
  local_seq: number;
  global_seq: number | null;
  event_id: string;
  collection_id: string;
  type: string;
  key: string;
  payload: string;
  timestamp: number;
  sync_status: string;
};

let storePromise: Promise<EventStore> | null = null;

function getDatabaseUrl(): string {
  return process.env["DATABASE_URL"] ?? "file:./local.db";
}

function getDriver() {
  return createLibsqlDriver(getDatabaseUrl(), process.env["DATABASE_AUTH_TOKEN"]);
}

export async function getEventStore(): Promise<EventStore> {
  if (!storePromise) {
    storePromise = (async () => {
      const store = new EventStore(getDriver());
      await store.initialize();
      return store;
    })();
  }
  return storePromise;
}

export async function resetEventStoreForTests(): Promise<EventStore> {
  storePromise = null;
  return getEventStore();
}

function deserializeRow(row: EventRow): StoredEvent {
  return {
    localSeq: row.local_seq,
    globalSeq: row.global_seq,
    eventId: row.event_id,
    collectionId: row.collection_id,
    type: row.type as StoredEvent["type"],
    key: row.key,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    timestamp: row.timestamp,
    syncStatus: row.sync_status as StoredEvent["syncStatus"],
  };
}

export async function listStoredEvents(limit = 200): Promise<StoredEvent[]> {
  const store = await getEventStore();
  await store.initialize();

  const rows = await getDriver().query<EventRow>(
    `SELECT local_seq, global_seq, event_id, collection_id, type, key, payload, timestamp, sync_status
     FROM esdb_events
     ORDER BY local_seq DESC
     LIMIT ?`,
    [limit],
  );

  return rows.map(deserializeRow);
}

export type AppendEventInput = {
  collectionId: string;
  type: StoredEvent["type"];
  key: string;
  payload: Record<string, unknown>;
};

export async function appendStoredEvent(input: AppendEventInput): Promise<number> {
  const store = await getEventStore();
  return store.append(
    generateEventId(),
    input.collectionId,
    input.type,
    input.key,
    input.payload,
    Date.now(),
  );
}

export async function deleteStoredEvent(eventId: string): Promise<boolean> {
  const store = await getEventStore();
  await store.initialize();

  const existing = await getDriver().query<{ event_id: string }>(
    `SELECT event_id FROM esdb_events WHERE event_id = ?`,
    [eventId],
  );

  if (existing.length === 0) {
    return false;
  }

  await getDriver().run(`DELETE FROM esdb_events WHERE event_id = ?`, [eventId]);
  return true;
}

export async function getPendingCount(): Promise<number> {
  const store = await getEventStore();
  return store.getPendingCount();
}

export async function syncLocalEvents(): Promise<SyncResult> {
  const store = await getEventStore();
  const errors: Error[] = [];
  let pushed = 0;
  let pulled = 0;

  try {
    const pending = await store.getPending();

    if (pending.length > 0) {
      const outbound: OutboundEvent[] = pending.map((event) => ({
        eventId: event.eventId,
        collectionId: event.collectionId,
        type: event.type,
        key: event.key,
        payload: event.payload,
        timestamp: event.timestamp,
      }));

      const confirmed = await remotePushEvents(outbound);
      await store.markSynced(confirmed);
      pushed = confirmed.length;
    }
  } catch (error) {
    errors.push(error instanceof Error ? error : new Error(String(error)));
  }

  try {
    let hasMore = true;

    while (hasMore) {
      const { lastGlobalSeq } = await store.getCursor();
      const response = await remotePullEvents(lastGlobalSeq);

      if (response.events.length > 0) {
        await store.applyServerBatch(response.events as ServerEvent[], async () => {});
        pulled += response.events.length;
      }

      hasMore = response.hasMore;
    }
  } catch (error) {
    errors.push(error instanceof Error ? error : new Error(String(error)));
  }

  return { pushed, pulled, errors };
}
