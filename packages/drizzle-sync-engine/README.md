# drizzle-sync-engine

Drizzle-backed event sync engine with **extensible inbox/outbox tables**. Same push/pull wire protocol as `event-sourced-collection`, but state lives in SQLite or PGlite/Postgres via Drizzle — not in TanStack DB memory.

> **Status:** scaffold. Schema builders + typed engine API are ready. `mutate` / `sync` apply path is not implemented yet.

## Install

```bash
npm install drizzle-sync-engine drizzle-orm
```

## Quick start (SQLite)

```ts
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";
import { createDrizzleSyncEngine } from "drizzle-sync-engine";
import { defineOutboxTable, defineInboxTable } from "drizzle-sync-engine/sqlite";

export const outbox = defineOutboxTable("sync_outbox", {
  deviceId: text("device_id"),
  priority: integer("priority").default(0),
});

export const inbox = defineInboxTable("sync_inbox", {
  receivedAt: integer("received_at"),
});

export const todos = sqliteTable("todos", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export type OutboxRow = typeof outbox.$inferSelect; // includes deviceId | priority

const engine = createDrizzleSyncEngine({
  db, // your drizzle(sqlite) instance
  tables: { outbox, inbox },
  collections: {
    todos: {
      table: todos,
      getKey: (row) => row.id,
    },
  },
  sync: { pushEvents, pullEvents },
  hooks: {
    onAppendOutbox: (row) => ({
      ...row,
      deviceId: getDeviceId(),
    }),
    onPullInbox: (row) => ({
      ...row,
      receivedAt: Date.now(),
    }),
  },
});

// Own migrations: include outbox/inbox in your drizzle schema + drizzle-kit migrate
```

## Postgres / PGlite

```ts
import { defineOutboxTable, defineInboxTable } from "drizzle-sync-engine/pg";
```

Same API; column types use `jsonb` / `boolean` / `bigint` as appropriate.

## Design

| Piece            | Role                                                                  |
| ---------------- | --------------------------------------------------------------------- |
| Required columns | Frozen by the library (`eventId`, `sync`, …)                          |
| Extra columns    | You pass into `define*Table(..., extra)` and migrate                  |
| Hooks            | Typed from your extended `$inferSelect` — no casts                    |
| Wire protocol    | Same `OutboundEvent` / `ServerEvent` / push-pull shapes               |
| Domain data      | Queried via Drizzle (`limit`/`offset`) — not loaded into JS wholesale |

## Exports

- `drizzle-sync-engine` — `createDrizzleSyncEngine`, protocol types
- `drizzle-sync-engine/sqlite` — `defineOutboxTable`, `defineInboxTable`, …
- `drizzle-sync-engine/pg` — Postgres/PGlite builders

## Roadmap

- [x] Protocol types (compatible with event-sourced-collection)
- [x] SQLite + PG schema builders with extras
- [x] Typed engine factory + hooks surface
- [ ] Transactional `mutate` (domain write + outbox append)
- [ ] Push / pull / inbox replay apply path
- [ ] React helpers (`useManualSync`, …)
