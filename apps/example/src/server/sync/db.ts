import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let schemaReady: Promise<void> | null = null;

function createSyncClient() {
  const url =
    process.env["SYNC_DATABASE_URL"] ?? process.env["DATABASE_URL"] ?? "file:./sync-server.db";
  const authToken = process.env["SYNC_DATABASE_AUTH_TOKEN"] ?? process.env["DATABASE_AUTH_TOKEN"];

  return createClient({
    url,
    authToken,
  });
}

/**
 * Returns the singleton Drizzle instance for the sync database.
 *
 * Connects via `@libsql/client` using `SYNC_DATABASE_URL` / `SYNC_DATABASE_AUTH_TOKEN`,
 * falling back to `DATABASE_URL` / `DATABASE_AUTH_TOKEN`, then `file:./sync-server.db`.
 */
export function getSyncDb() {
  if (!db) {
    db = drizzle(createSyncClient(), { schema });
  }

  return db;
}

/**
 * Creates the `sync_events` table and index when they do not already exist.
 *
 * Safe to call on every server start; uses `CREATE TABLE IF NOT EXISTS` and
 * `CREATE INDEX IF NOT EXISTS`.
 */
export async function ensureSyncSchema(): Promise<void> {
  const database = getSyncDb();

  await database.run(sql`
    CREATE TABLE IF NOT EXISTS sync_events (
      global_seq        INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id          TEXT    NOT NULL UNIQUE,
      collection_id     TEXT    NOT NULL,
      type              TEXT    NOT NULL,
      key               TEXT    NOT NULL,
      payload           TEXT    NOT NULL,
      client_timestamp  INTEGER NOT NULL,
      server_timestamp  INTEGER NOT NULL DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER))
    )
  `);

  await database.run(sql`
    CREATE INDEX IF NOT EXISTS idx_sync_events_global_seq ON sync_events (global_seq)
  `);
}

/**
 * Ensures the sync schema exists once, then runs the given callback.
 *
 * Wraps remote push/pull handlers so they can assume the database is ready without
 * repeating schema initialization logic.
 */
export async function withSyncSchema<T>(fn: () => Promise<T>): Promise<T> {
  if (!schemaReady) {
    schemaReady = ensureSyncSchema();
  }

  await schemaReady;
  return fn();
}
