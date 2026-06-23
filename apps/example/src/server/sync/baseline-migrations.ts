import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Client } from "@libsql/client";

type MigrationJournal = {
  entries: ReadonlyArray<{
    tag: string;
    when: number;
  }>;
};

export async function baselineLegacyMigrationsIfNeeded(
  client: Client,
  migrationsFolder: string,
): Promise<void> {
  const tablesResult = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='sync_events'",
  );

  if (tablesResult.rows.length === 0) {
    return;
  }

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash text NOT NULL,
      created_at numeric
    )
  `);

  const appliedResult = await client.execute("SELECT hash FROM __drizzle_migrations");
  const appliedHashes = new Set(appliedResult.rows.map((row) => String(row.hash)));

  const journal = JSON.parse(
    readFileSync(path.join(migrationsFolder, "meta", "_journal.json"), "utf8"),
  ) as MigrationJournal;

  for (const entry of journal.entries) {
    const sql = readFileSync(path.join(migrationsFolder, `${entry.tag}.sql`), "utf8");
    const hash = createHash("sha256").update(sql).digest("hex");

    if (appliedHashes.has(hash)) {
      continue;
    }

    await client.execute({
      sql: "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
      args: [hash, entry.when],
    });
  }
}
