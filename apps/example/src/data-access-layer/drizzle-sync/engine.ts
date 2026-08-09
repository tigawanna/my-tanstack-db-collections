/**
 * Usage example: wire `createDrizzleSyncEngine` with extended inbox/outbox tables.
 *
 * `mutate` / `sync` are still scaffolded in the package — this module shows the
 * typed public API (hooks, collections, syncEnabled) you will call once apply lands.
 */

import { createDrizzleSyncEngine, generateEventId } from "drizzle-sync-engine";
import type { PullResponse, PushResponse } from "drizzle-sync-engine";

import {
  drizzleSyncInbox,
  drizzleSyncNotes,
  drizzleSyncOutbox,
  type DrizzleSyncNote,
} from "./schema";

const DEMO_DEVICE_ID = "example-web";

/** Placeholder until the apply path needs a real drizzle(sqlite) / PGlite instance. */
type DemoDb = Record<string, never>;

async function pushEvents(): Promise<PushResponse> {
  // Swap for your API — same wire shape as event-sourced-collection.
  return { confirmed: [], failed: [] };
}

async function pullEvents({ since }: { since: number }): Promise<PullResponse> {
  void since;
  return { events: [], cursor: "0", hasMore: false };
}

export const drizzleSyncEngine = createDrizzleSyncEngine({
  db: {} as DemoDb,
  tables: {
    outbox: drizzleSyncOutbox,
    inbox: drizzleSyncInbox,
  },
  collections: {
    notes: {
      table: drizzleSyncNotes,
      getKey: (note: DrizzleSyncNote) => note.id,
    },
  },
  syncEnabled: true,
  sync: { pushEvents, pullEvents },
  hooks: {
    onAppendOutbox: (row) => ({
      ...row,
      deviceId: row.deviceId ?? DEMO_DEVICE_ID,
      priority: row.type === "delete" ? 1 : (row.priority ?? 0),
    }),
    onPullInbox: (row) => ({
      ...row,
      receivedAt: row.receivedAt ?? Date.now(),
    }),
  },
});

export function createDemoNoteInput(title: string): {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
} {
  return {
    id: generateEventId(),
    title,
    body: "",
    updatedAt: Date.now(),
  };
}

export { DEMO_DEVICE_ID };
