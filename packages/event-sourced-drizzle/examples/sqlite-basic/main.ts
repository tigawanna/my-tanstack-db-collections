// @ts-nocheck
/**
 * Example: using the event-sourced Drizzle engine in a Node.js app.
 *
 * This shows the full lifecycle:
 * 1. Open the database + run migrations
 * 2. Initialize the engine
 * 3. Mutate data (automatically appends to outbox)
 * 4. Sync (push outbox → server, pull server → inbox → replay)
 * 5. Query data via Drizzle
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { initEngine } from "./engine";
import { todos } from "./schema";

async function main() {
  // 1. Open SQLite database.
  const sqlite = new Database("./app.sqlite");
  const db = drizzle(sqlite);

  // 2. Run migrations (creates domain + sync tables).
  //    In production, use drizzle-kit to generate migrations from your schema.
  migrate(db, { migrationsFolder: "./drizzle" });

  // 3. Initialize the event-sourced engine.
  const engine = await initEngine(db as never);
  console.log("Engine initialized.");

  // 4. Write data — domain insert + outbox append happen atomically.
  const todoId = crypto.randomUUID();
  await engine.mutate.insert("todos", {
    id: todoId,
    title: "Buy groceries",
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  console.log(`Inserted todo: ${todoId}`);

  // 5. Update.
  await engine.mutate.update("todos", todoId, {
    status: "complete",
    updatedAt: Date.now(),
  });
  console.log(`Marked todo complete: ${todoId}`);

  // 6. Sync — pushes outbox events to server, pulls remote events.
  const result = await engine.sync();
  console.log("Sync result:", {
    pushed: result.pushed,
    pulled: result.pulled,
    errors: result.errors.length,
  });

  // 7. Query data via Drizzle (standard Drizzle queries, not via the engine).
  const allTodos = db.select().from(todos).all();
  console.log("All todos:", allTodos);

  // 8. Manual sync — also replays any pending inbox rows.
  const manualResult = await engine.manualSync();
  console.log("Manual sync:", {
    pushed: manualResult.pushed,
    pulled: manualResult.pulled,
    replayed: manualResult.replayed,
  });

  // 9. Toggle sync off (e.g. from a settings screen).
  engine.setSyncEnabled(false);
  console.log("Sync disabled. Mutations still go to outbox.");

  await engine.mutate.insert("todos", {
    id: crypto.randomUUID(),
    title: "This stays in outbox until sync is re-enabled",
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // 10. Re-enable and sync.
  engine.setSyncEnabled(true);
  await engine.sync();

  // 11. Cleanup.
  engine.dispose();
  sqlite.close();
  console.log("Done.");
}

main().catch(console.error);
