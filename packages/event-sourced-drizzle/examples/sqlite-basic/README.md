# SQLite Basic Example

A minimal Node.js app showing how to wire `event-sourced-drizzle` with better-sqlite3.

## Files

| File                | Purpose                                                    |
| ------------------- | ---------------------------------------------------------- |
| `schema.ts`         | Drizzle schema — domain table + sync infrastructure tables |
| `adapter.ts`        | Builds the `DrizzleAdapter` from the schema                |
| `sync-transport.ts` | Push/pull functions that talk to your API                  |
| `engine.ts`         | Creates the engine singleton with config and hooks         |
| `main.ts`           | End-to-end usage: init, mutate, sync, query, dispose       |

## Setup

```bash
# Install dependencies
npm install event-sourced-drizzle drizzle-orm better-sqlite3

# Generate migrations from the schema
npx drizzle-kit generate

# Run the example
npx tsx main.ts
```

## Key Points

1. **Schema ownership is yours.** You define tables with `defineOutboxTable`, `defineInboxTable`, etc., and run your own migrations with drizzle-kit.

2. **Mutations are transactional.** `engine.mutate.insert("todos", row)` atomically writes the domain row AND the outbox event in one SQLite transaction.

3. **Sync is explicit.** Call `engine.sync()` when you want — on a timer, on reconnect, on user action. There's no background magic.

4. **Reads go through Drizzle.** The engine doesn't own queries. Use `db.select().from(todos)` as normal — full Drizzle power (joins, aggregates, pagination).

5. **Hooks for observability.** `onDeadLetter`, `onSyncError`, `onEventApplied` etc. give you visibility without coupling business logic to the sync layer.

## Server

This example expects a server at `http://localhost:3000/api/sync/events` implementing the push/pull protocol described in the package README. See the `event-sourced-collection` package's `examples/postgres-sync-server/` for a reference implementation — the wire protocol is identical.
