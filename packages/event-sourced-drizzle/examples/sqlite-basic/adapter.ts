// @ts-nocheck
/**
 * Builds the DrizzleAdapter for the SQLite todo app.
 *
 * The adapter bridges the event-sourced engine to your Drizzle instance.
 * It maps abstract operations (domainInsert, queryDueOutbox, etc.) to
 * concrete Drizzle queries against your schema.
 */
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { createSQLiteAdapter } from "event-sourced-drizzle/sqlite";

import { deadLetter, inbox, outbox, syncMeta, todos } from "./schema";

export function buildAdapter(db: BetterSQLite3Database) {
  return createSQLiteAdapter(db as never, {
    outbox,
    inbox,
    syncMeta,
    deadLetter,
    collections: {
      todos: { table: todos, keyColumn: todos.id },
    },
  });
}
