// @ts-nocheck
/**
 * Creates and exports the event-sourced Drizzle engine.
 *
 * Call `initEngine()` once at app startup. Then use `engine.mutate.*` for
 * writes and `engine.sync()` or `engine.manualSync()` to sync.
 */
import { createEventSourcedDrizzle } from "event-sourced-drizzle";
import type { EventSourcedDrizzle, CollectionDef } from "event-sourced-drizzle";

import { buildAdapter } from "./adapter";
import { todos } from "./schema";
import { pushEvents, pullEvents } from "./sync-transport";

// --- Collection definitions (keys = collectionId on the wire) ---

type AppCollections = {
  todos: CollectionDef<typeof todos, string>;
};

const collections: AppCollections = {
  todos: { table: todos, getKey: (row) => row.id },
};

// --- Engine singleton ---

let engine: EventSourcedDrizzle<AppCollections> | null = null;

/**
 * Initialize the engine with a Drizzle database instance.
 * Call once at app startup after running migrations.
 */
export async function initEngine(db: never): Promise<EventSourcedDrizzle<AppCollections>> {
  if (engine) return engine;

  const adapter = buildAdapter(db);

  engine = await createEventSourcedDrizzle({
    adapter,
    collections,
    sync: { pushEvents, pullEvents },
    syncEnabled: true,
    debug: true, // logs to console in development
    hooks: {
      onReady: ({ clientId, pullCursor }) => {
        console.log(`Engine ready — clientId: ${clientId}, cursor: ${pullCursor}`);
      },
      onDeadLetter: (entry) => {
        console.error(`Dead-lettered: ${entry.collectionId}/${entry.key} — ${entry.reason}`);
      },
      onSyncError: ({ phase, error }) => {
        console.error(`Sync ${phase} error:`, error.message);
      },
    },
  });

  return engine;
}

export function getEngine(): EventSourcedDrizzle<AppCollections> {
  if (!engine) throw new Error("Engine not initialized. Call initEngine() first.");
  return engine;
}
