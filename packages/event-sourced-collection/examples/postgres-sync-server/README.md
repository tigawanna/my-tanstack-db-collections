# PostgreSQL sync server (reference)

Copy-paste handlers for `POST /api/sync/events` and `GET /api/sync/events?since=…`
against the schema in the package README.

This is **not** a runnable app — it is the production pattern the client expects.
Inline comments explain _why_ each step is there.

## What goes wrong without care

| Problem                                                                       | What you see                      | How this example handles it                                            |
| ----------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------- |
| Concurrent inserts take `BIGSERIAL` before commit; client advances past a gap | An event never arrives            | Advisory lock on push, and/or `xmin` filter on pull (use at least one) |
| Same `eventId` pushed twice (retry / second tab)                              | Duplicate rows or a 500           | Unique `event_id` + return the existing `global_seq`                   |
| Only half of a client `txId` commits                                          | Partial transaction on the server | Group by `txId`, one DB transaction per group                          |
| Client edited a row that already moved on (`baseVersion`)                     | Silent overwrite                  | Reject with `CONFLICT` / `retryable: false`                            |
| Server DB wiped; sequences restart at 1                                       | Client cursor stuck forever       | Stable `backend_id` on every pull                                      |
| Multiple phones / tabs                                                        | —                                 | Still one Postgres assigning order. Multi-device ≠ multi-primary       |

**UUIDv7** is great for client `eventId` uniqueness. It is **not** a stand-in for
server `global_seq`: minting a sortable id before commit has the same visibility
race.

## Files

- [`handlers.ts`](./handlers.ts) — push + pull with plain-language comments
- [`schema.sql`](./schema.sql) — tables + indexes

## Flow at a glance

```
pushEvents(batch)
  └─ for each txId group
       BEGIN
       pg_advisory_xact_lock          ← one writer at a time for the log
       for each event
         SELECT by event_id           ← safe retries / second tab
         check baseVersion vs head    ← stale edit → CONFLICT
         INSERT … RETURNING seq
       on any group failure → ROLLBACK ← keep the client transaction whole
       else COMMIT

pullEvents(since)
  read sync_backend.backend_id        ← detect wiped / replaced DB
  SELECT … WHERE seq > since
    AND seq < pg_snapshot_xmin(...)   ← skip sequences still in flight
  ORDER BY seq ASC LIMIT N
```

Wire `pushEvents` / `pullEvents` to HTTP the same way as the main README.
