import { createClient } from "@libsql/client";

let client: ReturnType<typeof createClient> | null = null;

export function getSyncTursoClient() {
  if (!client) {
    const url =
      process.env["SYNC_DATABASE_URL"] ?? process.env["DATABASE_URL"] ?? "file:./sync-server.db";
    const authToken = process.env["SYNC_DATABASE_AUTH_TOKEN"] ?? process.env["DATABASE_AUTH_TOKEN"];

    client = createClient({
      url,
      authToken,
    });
  }

  return client;
}

export async function initSyncSchema(): Promise<void> {
  const db = getSyncTursoClient();

  await db.execute(`
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

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_sync_events_global_seq ON sync_events (global_seq)
  `);
}
