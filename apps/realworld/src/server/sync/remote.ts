import { and, asc, desc, eq, gt } from "drizzle-orm";
import type {
  OutboundEvent,
  PullResponse,
  PushConfirmation,
  PushFailure,
  PushResponse,
  ServerEvent,
} from "event-sourced-collection";
import { getSyncDb, withSyncSchema } from "./db";
import { syncBackend, syncEvents } from "./schema";

const PULL_LIMIT = 500;
const BACKEND_ROW_ID = 1;

type SyncDb = ReturnType<typeof getSyncDb>;
type SyncTx = Parameters<Parameters<SyncDb["transaction"]>[0]>[0];

/**
 * Reads (or lazily creates) this store's identity. Recreating the database
 * produces a new value, which is how clients learn their cursor is stale.
 */
async function getBackendId(): Promise<string> {
  const db = getSyncDb();

  const existing = await db
    .select({ backendId: syncBackend.backendId })
    .from(syncBackend)
    .where(eq(syncBackend.id, BACKEND_ROW_ID))
    .limit(1);

  if (existing.length > 0) return existing[0]!.backendId;

  const backendId = crypto.randomUUID();
  await db.insert(syncBackend).values({ id: BACKEND_ROW_ID, backendId }).onConflictDoNothing();

  const stored = await db
    .select({ backendId: syncBackend.backendId })
    .from(syncBackend)
    .where(eq(syncBackend.id, BACKEND_ROW_ID))
    .limit(1);

  return stored[0]?.backendId ?? backendId;
}

/**
 * Rejects a write authored against a row version the server has since moved
 * past. Only enforced when the client opted in by sending `baseVersion`.
 */
async function findConflict(tx: SyncTx, event: OutboundEvent): Promise<PushFailure | null> {
  if (!event.baseVersion) return null;

  const latest = await tx
    .select({ eventId: syncEvents.eventId })
    .from(syncEvents)
    .where(
      and(eq(syncEvents.collectionId, event.collectionId), eq(syncEvents.key, String(event.key))),
    )
    .orderBy(desc(syncEvents.globalSeq))
    .limit(1);

  const current = latest[0]?.eventId ?? null;

  if (current === null || current === event.baseVersion) return null;

  return {
    eventId: event.eventId,
    message: `Row "${event.collectionId}/${String(event.key)}" changed since this edit was made`,
    code: "CONFLICT",
    retryable: false,
  };
}

function groupByTxId(events: ReadonlyArray<OutboundEvent>): OutboundEvent[][] {
  const groups: OutboundEvent[][] = [];
  let current: OutboundEvent[] = [];
  let currentTx: string | null = null;

  for (const event of events) {
    if (currentTx !== null && event.txId !== currentTx) {
      groups.push(current);
      current = [];
    }
    currentTx = event.txId;
    current.push(event);
  }

  if (current.length > 0) groups.push(current);
  return groups;
}

type GroupAbort = Error & {
  code: "TX_GROUP_FAILED";
  groupFailed: PushFailure[];
  dedupConfirmed: PushConfirmation[];
  freshConfirmed: PushConfirmation[];
};

function isGroupAbort(err: unknown): err is GroupAbort {
  return err instanceof Error && (err as GroupAbort).code === "TX_GROUP_FAILED";
}

/**
 * Persists outbound client events and returns server-assigned sequence numbers.
 *
 * Matches the package server contract, adapted for SQLite/libsql:
 * - group by `txId` and commit or roll back as one unit
 * - `BEGIN IMMEDIATE` via Drizzle so the write lock is taken up front
 * - dedupe by `eventId`, honour `baseVersion` conflicts
 *
 * SQLite already serializes writers; IMMEDIATE makes assign+commit ordering
 * explicit. On Postgres prefer the advisory-lock + xmin reference in
 * event-sourced-collection/examples/postgres-sync-server.
 */
export async function remotePushEvents(
  events: ReadonlyArray<OutboundEvent>,
): Promise<PushResponse> {
  if (events.length === 0) {
    return { confirmed: [], failed: [] };
  }

  return withSyncSchema(async () => {
    const db = getSyncDb();
    const confirmed: PushConfirmation[] = [];
    const failed: PushFailure[] = [];

    for (const group of groupByTxId(events)) {
      try {
        const groupResult = await db.transaction(
          async (tx) => {
            const dedupConfirmed: PushConfirmation[] = [];
            const freshConfirmed: PushConfirmation[] = [];
            const groupFailed: PushFailure[] = [];

            for (const event of group) {
              const existing = await tx
                .select({ globalSeq: syncEvents.globalSeq })
                .from(syncEvents)
                .where(eq(syncEvents.eventId, event.eventId))
                .limit(1);

              if (existing.length > 0) {
                dedupConfirmed.push({
                  eventId: event.eventId,
                  globalSeq: existing[0]!.globalSeq,
                });
                continue;
              }

              const conflict = await findConflict(tx, event);

              if (conflict) {
                groupFailed.push(conflict);
                continue;
              }

              const inserted = await tx
                .insert(syncEvents)
                .values({
                  eventId: event.eventId,
                  collectionId: event.collectionId,
                  type: event.type,
                  key: String(event.key),
                  payload: JSON.stringify(event.payload),
                  previous: event.previous ? JSON.stringify(event.previous) : null,
                  txId: event.txId,
                  clientId: event.clientId,
                  schemaVersion: event.schemaVersion ?? 1,
                  clientTimestamp: event.timestamp,
                })
                .returning({ globalSeq: syncEvents.globalSeq });

              freshConfirmed.push({
                eventId: event.eventId,
                globalSeq: inserted[0]!.globalSeq,
              });
            }

            if (groupFailed.length > 0) {
              const error = new Error("Transaction group aborted") as GroupAbort;
              error.code = "TX_GROUP_FAILED";
              error.groupFailed = groupFailed;
              error.dedupConfirmed = dedupConfirmed;
              error.freshConfirmed = freshConfirmed;
              throw error;
            }

            return { dedupConfirmed, freshConfirmed };
          },
          { behavior: "immediate" },
        );

        confirmed.push(...groupResult.dedupConfirmed, ...groupResult.freshConfirmed);
      } catch (err) {
        if (isGroupAbort(err)) {
          confirmed.push(...err.dedupConfirmed);
          failed.push(...err.groupFailed);

          for (const entry of err.freshConfirmed) {
            failed.push({
              eventId: entry.eventId,
              message: "Transaction group aborted because a sibling event failed",
              code: "TX_ABORTED",
              retryable: false,
            });
          }
          continue;
        }

        for (const event of group) {
          failed.push({
            eventId: event.eventId,
            message: err instanceof Error ? err.message : "push failed",
            code: "TRANSIENT",
            retryable: true,
          });
        }
      }
    }

    return { confirmed, failed };
  });
}

/**
 * Fetches server events newer than a global sequence cursor for client replay.
 *
 * Always returns `backendId` so clients can detect a wiped or swapped store.
 */
export async function remotePullEvents(since: number): Promise<PullResponse> {
  return withSyncSchema(async () => {
    const db = getSyncDb();
    const backendId = await getBackendId();

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
      previous: row.previous ? (JSON.parse(row.previous) as Record<string, unknown>) : null,
      txId: row.txId ?? undefined,
      clientId: row.clientId,
      schemaVersion: row.schemaVersion,
      timestamp: row.clientTimestamp,
      cursor: String(row.globalSeq),
    }));

    const cursor = events.length > 0 ? events[events.length - 1]!.cursor : String(since);

    return {
      events,
      cursor,
      hasMore: events.length === PULL_LIMIT,
      backendId,
    };
  });
}
