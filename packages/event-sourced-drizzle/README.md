# event-sourced-drizzle

Event-sourced local-first sync engine for **Drizzle ORM**. Same push/pull wire protocol as `event-sourced-collection`, but all state lives in your SQL database (SQLite, PGlite, Postgres) — managed by Drizzle, not TanStack DB memory.

Every `insert`, `update`, and `delete` goes through a typed `mutate` API that atomically writes the domain table AND appends an outbox event. Sync pushes outbox events to your server and pulls remote events into an inbox, replaying them into domain tables.

## Install

```bash
npm install event-sourced-drizzle drizzle-orm
```

## Quick Start (SQLite)

```ts
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";
import { createEventSourcedDrizzle } from "event-sourced-drizzle";
import { defineOutboxTable, defineInboxTable } from "event-sourced-drizzle/sqlite";

// --- Schema ---

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

// --- Engine ---

const engine = await createEventSourcedDrizzle({
  adapter: createSQLiteAdapter(db, { outbox, inbox, todos }),
  collections: {
    todos: { table: todos, getKey: (row) => row.id },
  },
  sync: { pushEvents, pullEvents },
});

// Mutations: domain write + outbox append in one transaction
await engine.mutate.insert("todos", {
  id: crypto.randomUUID(),
  title: "Buy groceries",
  updatedAt: Date.now(),
});

// Sync: push outbox → server, pull server → inbox → replay into tables
await engine.sync();
```

## Postgres / PGlite

```ts
import { defineOutboxTable, defineInboxTable } from "event-sourced-drizzle/pg";
```

Same API; column types use `jsonb` / `boolean` / `bigint` as appropriate.

## Architecture

This package mirrors the architecture of `event-sourced-collection`:

```
src/
├── internal/
│   ├── constants.ts       # Defaults, error codes, sync-meta keys
│   ├── hooks.ts           # Lifecycle hook emitter
│   ├── push.ts            # Outbox → server (batching, retry, dead-letter)
│   ├── pull.ts            # Server → inbox (cursor, overlap, local-origin filtering)
│   ├── replay.ts          # Inbox → domain tables (upcast, apply, dead-letter)
│   ├── serial-queue.ts    # In-process mutual exclusion
│   ├── sync-meta.ts       # Pull cursor, clientId, backendId persistence
│   └── types.ts           # Internal types (DrizzleAdapter, OutboxRow, InboxRow, etc.)
├── schema/
│   ├── pg.ts              # Postgres schema builder with extensible columns
│   └── sqlite.ts          # SQLite schema builder with extensible columns
├── utils/
│   ├── logger.ts          # Structured logger
│   └── uuid.ts            # UUIDv7 event ID generation
├── create-event-sourced-drizzle.ts   # Main factory
├── sync.ts                # Transport normalization (URL/handlers/raw)
├── types.ts               # Public API types
├── index.ts               # Barrel export (main entry)
├── sqlite.ts              # Barrel for schema/sqlite
└── pg.ts                  # Barrel for schema/pg
```

### Key Differences from `event-sourced-collection`

| Aspect        | event-sourced-collection                           | event-sourced-drizzle                               |
| ------------- | -------------------------------------------------- | --------------------------------------------------- |
| State storage | TanStack DB in-memory collections backed by SQLite | SQL tables via Drizzle ORM                          |
| Query engine  | TanStack DB live queries                           | Drizzle's query builder (limit/offset, joins, etc.) |
| Schema        | Fixed internal structure                           | Extensible — add custom columns to outbox/inbox     |
| Persistence   | Automatic via TanStack DB                          | You manage migrations with drizzle-kit              |
| Platform      | Browser OPFS, React Native                         | Anywhere Drizzle runs (Node, Bun, edge, mobile)     |
| Wire protocol | Same                                               | Same (servers are interchangeable)                  |

### DrizzleAdapter

The engine communicates with your database through a `DrizzleAdapter` interface. This keeps the core pipeline database-agnostic — you can implement it for any Drizzle dialect:

```ts
type DrizzleAdapter = {
  transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
  queryDueOutbox: (now: number) => Promise<OutboxRow[]>;
  updateOutbox: (eventId: string, patch: Partial<OutboxRow>) => Promise<void>;
  markOutboxSynced: (eventId: string, globalSeq: number) => Promise<void>;
  deleteOutboxRow: (eventId: string) => Promise<void>;
  insertDeadLetter: (row: DeadLetterRow) => Promise<void>;
  insertInbox: (row: InboxRow) => Promise<void>;
  updateInbox: (eventId: string, patch: Partial<InboxRow>) => Promise<void>;
  getInboxRow: (eventId: string) => Promise<InboxRow | undefined>;
  queryUnresolvedInbox: () => Promise<InboxRow[]>;
  outboxHas: (eventId: string) => Promise<boolean>;
  readMeta: (key: string) => Promise<string | null>;
  writeMeta: (key: string, value: string) => Promise<void>;
  domainInsert: (collectionId: string, row: Record<string, unknown>) => Promise<void>;
  domainUpdate: (
    collectionId: string,
    key: string | number,
    patch: Record<string, unknown>,
  ) => Promise<void>;
  domainDelete: (collectionId: string, key: string | number) => Promise<void>;
};
```

### Extensible Inbox/Outbox Tables

The schema builders enforce required columns at compile time but let you add your own:

```ts
const outbox = defineOutboxTable("sync_outbox", {
  deviceId: text("device_id"), // your custom column
  priority: integer("priority"), // your custom column
});
// TypeScript enforces all required columns exist + your extras are typed
```

This means hooks like `onAppendOutbox` and `onPullInbox` can work with your extended row types without casts.

## Sync Transport

Same three config styles as `event-sourced-collection`:

```ts
// URL strings — built-in HTTP adapter
sync: { pushUrl: "/api/events", pullUrl: "/api/events" }

// Handler functions
sync: { pushEvents: myPushFn, pullEvents: myPullFn }

// Raw transport
sync: { push: fn, pull: fn }
```

## Configuration

| Option                 | Default                       | Description                                                  |
| ---------------------- | ----------------------------- | ------------------------------------------------------------ |
| `adapter`              | required                      | DrizzleAdapter bridging engine to your DB                    |
| `collections`          | required                      | Collection registry — keys become `collectionId` on the wire |
| `sync`                 | none                          | Transport config. Omit for offline-only                      |
| `syncEnabled`          | `true`                        | Whether sync runs. Toggle with `setSyncEnabled()`            |
| `clientId`             | auto-generated                | Stable device identity                                       |
| `unknownEventHandling` | `"skip"`                      | What to do with events for unknown collections               |
| `pullOverlap`          | `0`                           | Cursor overlap for out-of-order sequence protection          |
| `eventSchemaVersion`   | `1`                           | Stamped on every authored event                              |
| `upcastEvent`          | none                          | Migrates events from older schema versions                   |
| `retry`                | 8 attempts, 1s base, 5min cap | Backoff for retryable push failures                          |
| `pushBatchSize`        | `100`                         | Max events per push request                                  |
| `backendMismatch`      | `"resetCursor"`               | What to do when server identity changes                      |
| `hooks`                | none                          | Lifecycle hooks                                              |
| `debug`                | `false`                       | Logger config                                                |

## Lifecycle Hooks

Same set as `event-sourced-collection`:

| Hook                | Fires when                                 |
| ------------------- | ------------------------------------------ |
| `onReady`           | Engine initialized, pending inbox replayed |
| `onMutation`        | Local mutation appended to outbox          |
| `onSyncStart`       | Sync cycle begins                          |
| `onSyncComplete`    | Sync cycle finishes                        |
| `onSyncError`       | A phase (push/pull/replay) fails           |
| `onEventPushed`     | Server confirms an outbound event          |
| `onEventApplied`    | Remote event replayed into a domain table  |
| `onEventSkipped`    | Event recorded but not applied             |
| `onDeadLetter`      | Event moved to dead-letter queue           |
| `onBackendMismatch` | Server reports different backend identity  |

## Exports

- `event-sourced-drizzle` — `createEventSourcedDrizzle`, protocol types, logger, UUID
- `event-sourced-drizzle/sqlite` — `defineOutboxTable`, `defineInboxTable`, column defs
- `event-sourced-drizzle/pg` — Postgres/PGlite equivalents

## Server Compatibility

The wire protocol (`OutboundEvent`, `ServerEvent`, `PushResponse`, `PullResponse`) is identical to `event-sourced-collection`. Servers built for one work with the other — they're interchangeable.

## Status

The internal pipeline (push, pull, replay, retry, dead-letter, hooks) is implemented. The `DrizzleAdapter` interface is defined but reference adapter implementations for SQLite and Postgres are not yet provided — you implement it against your Drizzle instance for now. A `createSQLiteAdapter` / `createPgAdapter` helper is planned.

## Roadmap

- [x] Wire protocol types (compatible with event-sourced-collection)
- [x] SQLite + PG schema builders with extensible columns
- [x] Internal pipeline (push/pull/replay/retry/dead-letter)
- [x] Lifecycle hooks
- [x] Transport normalization (URL/handlers/raw)
- [x] Logger + structured debug output
- [ ] Reference `createSQLiteAdapter` / `createPgAdapter` helpers
- [ ] Full transactional mutate (domain write + outbox in one tx)
- [ ] React helpers (`useManualSync`, `useSyncEnabled`)
- [ ] Mock sync backend for testing
- [ ] Conflict detection + row version tracking
