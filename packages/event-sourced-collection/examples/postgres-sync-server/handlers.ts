/**
 * Reference PostgreSQL handlers for event-sourced-collection sync.
 *
 * Shapes match the package types:
 *   push(events) → { confirmed, failed? }
 *   pull(since)  → { events, cursor, hasMore, backendId }
 *
 * Assumes a `pg` Pool (or any client with `.query`). Swap the query helper for
 * your ORM — keep the transaction / lock / xmin behaviour.
 *
 * Many devices talking to one Postgres is normal: the server is still the single
 * place that assigns order. The tricky bits below are concurrent transactions on
 * that one database, which get more common as more devices sync at once.
 *
 * Walkthrough: ./README.md
 */

import type {
  OutboundEvent,
  PullResponse,
  PushConfirmation,
  PushFailure,
  PushResponse,
  ServerEvent,
} from "event-sourced-collection";

type SqlClient = {
  query: <T = unknown>(text: string, params?: ReadonlyArray<unknown>) => Promise<{ rows: T[] }>;
};

type Pool = {
  connect: () => Promise<SqlClient & { release: () => void }>;
};

const PULL_LIMIT = 500;

/** Stable key for pg_advisory_xact_lock — any int64 you keep consistent is fine. */
const EVENTS_SEQ_LOCK = 874_201;

export async function pushEvents(
  pool: Pool,
  events: ReadonlyArray<OutboundEvent>,
): Promise<PushResponse> {
  if (events.length === 0) return { confirmed: [], failed: [] };

  const confirmed: PushConfirmation[] = [];
  const failed: PushFailure[] = [];

  // The client already keeps a txId together in one batch; grouping again means
  // a hand-rolled caller can't accidentally commit half a transaction.
  for (const group of groupByTxId(events)) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // BIGSERIAL hands out the next number as soon as you insert, before the
      // transaction commits. Two writers can get 50 and 51, and if 51 commits
      // first a puller may advance past 50 and never see it.
      //
      // This lock makes "assign + commit" happen one writer at a time for the
      // event log. Throughput cost is usually fine for single-user / modest
      // multi-device sync. (A sortable UUID minted before commit has the same
      // race — it doesn't replace this.)
      await client.query("SELECT pg_advisory_xact_lock($1)", [EVENTS_SEQ_LOCK]);

      // Dedup hits stay valid even if we roll the group back later.
      const dedupConfirmed: PushConfirmation[] = [];
      // Inserts from this attempt — thrown away if a sibling in the group fails.
      const freshConfirmed: PushConfirmation[] = [];
      const groupFailed: PushFailure[] = [];

      for (const event of group) {
        // Retries and a second tab will push the same eventId again. Hand back
        // the seq we already assigned instead of inserting twice.
        const existing = await client.query<{ global_seq: string }>(
          `SELECT global_seq FROM events WHERE event_id = $1`,
          [event.eventId],
        );

        if (existing.rows[0]) {
          dedupConfirmed.push({
            eventId: event.eventId,
            globalSeq: Number(existing.rows[0].global_seq),
          });
          continue;
        }

        // When the client sends baseVersion, it is saying "I edited this row
        // based on that earlier event." If the row has moved on, fail hard so
        // the client can dead-letter it as a conflict instead of overwriting.
        if (event.baseVersion) {
          const head = await client.query<{ event_id: string }>(
            `SELECT event_id FROM events
             WHERE collection_id = $1 AND key = $2
             ORDER BY global_seq DESC
             LIMIT 1`,
            [event.collectionId, String(event.key)],
          );
          const current = head.rows[0]?.event_id ?? null;
          if (current !== null && current !== event.baseVersion) {
            groupFailed.push({
              eventId: event.eventId,
              message: `Row ${event.collectionId}/${String(event.key)} changed since this edit`,
              code: "CONFLICT",
              retryable: false,
            });
            continue;
          }
        }

        if (!isValidPayload(event)) {
          groupFailed.push({
            eventId: event.eventId,
            message: "Validation failed",
            code: "VALIDATION_ERROR",
            retryable: false,
          });
          continue;
        }

        const inserted = await client.query<{ global_seq: string }>(
          `INSERT INTO events (
             event_id, collection_id, type, key, payload, previous,
             tx_id, client_id, schema_version, client_timestamp
           ) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10)
           RETURNING global_seq`,
          [
            event.eventId,
            event.collectionId,
            event.type,
            String(event.key),
            JSON.stringify(event.payload),
            event.previous == null ? null : JSON.stringify(event.previous),
            event.txId,
            event.clientId,
            event.schemaVersion,
            event.timestamp,
          ],
        );

        freshConfirmed.push({
          eventId: event.eventId,
          globalSeq: Number(inserted.rows[0]!.global_seq),
        });
      }

      // Everything sharing a client txId should land together. One bad sibling
      // rolls back the new inserts from this attempt (dedup confirmations stay).
      if (groupFailed.length > 0) {
        await client.query("ROLLBACK");

        confirmed.push(...dedupConfirmed);
        failed.push(...groupFailed);

        for (const entry of freshConfirmed) {
          failed.push({
            eventId: entry.eventId,
            message: "Transaction group aborted because a sibling event failed",
            code: "TX_ABORTED",
            retryable: false,
          });
        }

        continue;
      }

      await client.query("COMMIT");
      confirmed.push(...dedupConfirmed, ...freshConfirmed);
    } catch (err) {
      await client.query("ROLLBACK");

      // Network / DB blips: tell the client it can try again later instead of
      // parking these in the dead-letter queue.
      for (const event of group) {
        failed.push({
          eventId: event.eventId,
          message: err instanceof Error ? err.message : "push failed",
          code: "TRANSIENT",
          retryable: true,
        });
      }
    } finally {
      client.release();
    }
  }

  return { confirmed, failed };
}

export async function pullEvents(pool: Pool, since: number): Promise<PullResponse> {
  const client = await pool.connect();
  try {
    // Clients remember this. If you wipe or replace the database and this value
    // changes, they know their old cursor is meaningless and can re-pull from 0.
    const backend = await client.query<{ backend_id: string }>(
      `SELECT backend_id FROM sync_backend WHERE id = 1`,
    );
    const backendId = backend.rows[0]?.backend_id;
    if (!backendId) {
      throw new Error("sync_backend row missing — run schema.sql");
    }

    // Don't hand out sequence numbers that another transaction may still be
    // sitting on. Anything at or above xmin can be allocated but not yet
    // visible to everyone.
    //
    // Best with the advisory lock on push as well. With only this filter,
    // clients simply wait until open transactions finish. If you can't change
    // the write path, the client's pullOverlap option is a fallback.
    const rows = await client.query<{
      global_seq: string;
      event_id: string;
      collection_id: string;
      type: ServerEvent["type"];
      key: string;
      payload: Record<string, unknown>;
      previous: Record<string, unknown> | null;
      tx_id: string | null;
      client_id: string | null;
      schema_version: number;
      client_timestamp: string;
    }>(
      `SELECT
         global_seq, event_id, collection_id, type, key, payload, previous,
         tx_id, client_id, schema_version, client_timestamp
       FROM events
       WHERE global_seq > $1
         AND global_seq < pg_snapshot_xmin(pg_current_snapshot())
       ORDER BY global_seq ASC
       LIMIT $2`,
      [since, PULL_LIMIT],
    );

    const events: ServerEvent[] = rows.rows.map((row) => {
      const globalSeq = Number(row.global_seq);
      return {
        globalSeq,
        eventId: row.event_id,
        collectionId: row.collection_id,
        type: row.type,
        key: row.key,
        payload: row.payload,
        previous: row.previous,
        txId: row.tx_id ?? undefined,
        clientId: row.client_id,
        schemaVersion: row.schema_version,
        timestamp: Number(row.client_timestamp),
        cursor: String(globalSeq),
      };
    });

    const cursor = events.length > 0 ? events[events.length - 1]!.cursor : String(since);

    return {
      events,
      cursor,
      hasMore: events.length === PULL_LIMIT,
      backendId,
    };
  } finally {
    client.release();
  }
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

function isValidPayload(event: OutboundEvent): boolean {
  return event.collectionId.length > 0 && event.payload != null;
}
