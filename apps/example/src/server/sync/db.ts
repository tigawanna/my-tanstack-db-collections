import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { existsSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";
import { baselineLegacyMigrationsIfNeeded } from "./baseline-migrations";
import { getSyncDatabaseAuthToken, getSyncDatabaseUrl } from "./database-url";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let schemaReady: Promise<void> | null = null;

function resolveMigrationsFolder(): string {
  const candidates = [
    path.resolve(import.meta.dirname, "../../../drizzle"),
    path.resolve(process.cwd(), "drizzle"),
  ];

  return candidates.find((folder) => existsSync(folder)) ?? candidates[0]!;
}

function createSyncClient() {
  return createClient({
    url: getSyncDatabaseUrl(),
    authToken: getSyncDatabaseAuthToken(),
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

export async function runSyncMigrations(): Promise<void> {
  const migrationsFolder = resolveMigrationsFolder();
  const client = createSyncClient();

  await baselineLegacyMigrationsIfNeeded(client, migrationsFolder);
  await migrate(getSyncDb(), { migrationsFolder });
}

export async function withSyncSchema<T>(fn: () => Promise<T>): Promise<T> {
  if (!schemaReady) {
    schemaReady = runSyncMigrations();
  }

  await schemaReady;
  return fn();
}
