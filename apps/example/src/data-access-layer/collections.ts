/**
 * Event-sourced local database for this app.
 *
 * Import `db` in components for reads/writes after startup.
 * Call `ensureDb()` once at app mount (see dashboard layout) before touching collections.
 *
 * Also exported:
 * - Row types (`User`, `Todo`, `AppSettings`) and `AppDb` for typing
 *
 * Related files:
 * - `app-settings.ts` — seeds settings row, persists `syncEnabled`, calls `db.setSyncEnabled()`
 * - `sync-events.ts` — wrappers around `db.sync()` / `db.manualSync()`
 * - `hooks/common/use-event-sourced-sync.ts` — background sync polling
 *
 * Built-in collections (always present, do not register these names):
 * - `db.collections.outbox` — local mutations waiting to upload
 * - `db.collections.inbox` — server events pulled to this device
 */

import { BasicIndex } from "@tanstack/db";
import { createBrowserEventSourcedDB } from "event-sourced-collection/browser";
import type {
  CollectionDef,
  EventSourcedDB,
  OutboundEvent,
  PullResponse,
  PushResponse,
} from "event-sourced-collection";

// Row shapes stored in SQLite — one type per registered collection below.
export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: number;
};

export type Todo = {
  id: string;
  userId: string;
  title: string;
  status: "pending" | "complete";
  createdAt: number;
  updatedAt: number;
};

// Singleton app preferences. Use id `"app"` (see APP_SETTINGS_ID in app-settings.ts).
// `syncEnabled` is mirrored to `db.setSyncEnabled()` so the Settings toggle controls push/pull.
export type AppSettings = {
  id: string;
  theme: "light" | "dark";
  language: string;
  syncEnabled: boolean;
};

// Keys must match the `collections` object passed to createBrowserEventSourcedDB.
type AppCollectionDefs = {
  users: CollectionDef<User, string>;
  todos: CollectionDef<Todo, string>;
  settings: CollectionDef<AppSettings, string>;
};

export type AppDb = EventSourcedDB<AppCollectionDefs>;

const getAccessToken = (): string => localStorage.getItem("accessToken") ?? "";

// Upload pending outbox rows. Called by db.sync() / db.manualSync() when sync is enabled.
async function pushEvents(events: ReadonlyArray<OutboundEvent>): Promise<PushResponse> {
  const response = await fetch("/api/sync/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify(events),
  });

  if (!response.ok) {
    throw new Error(`Push events failed with HTTP ${response.status}`);
  }

  return response.json() as Promise<PushResponse>;
}

// Download server events newer than the last synced globalSeq in inbox.
async function pullEvents({ since }: { since: number }): Promise<PullResponse> {
  const response = await fetch(`/api/sync/events?since=${encodeURIComponent(String(since))}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Pull events failed with HTTP ${response.status}`);
  }

  return response.json() as Promise<PullResponse>;
}

// Lazy singleton: ensureDb() opens SQLite once; db proxy forwards after init.
const { ensureDb, db } = createBrowserEventSourcedDB<AppCollectionDefs>({
  databaseName: "my-app.sqlite",
  debug: import.meta.env.DEV,

  // Register collections here — each key becomes db.collections.<key>.
  // indexes: optional; each entry calls collection.createIndex() at init (speeds up filters/joins).
  collections: {
    users: {
      getKey: (user: User) => user.id,
      indexes: [{ select: (user: User) => user.id, indexType: BasicIndex, name: "by-id" }],
    },
    todos: {
      getKey: (todo: Todo) => todo.id,
      indexes: [
        { select: (todo: Todo) => todo.id, indexType: BasicIndex, name: "by-id" },
        { select: (todo: Todo) => todo.userId, indexType: BasicIndex, name: "by-user" },
        { select: (todo: Todo) => todo.status, indexType: BasicIndex, name: "by-status" },
        { select: (todo: Todo) => todo.title, indexType: BasicIndex, name: "by-title" },
      ],
    },
    settings: { getKey: (settings: AppSettings) => settings.id },
  },

  // Initial default; users can toggle at runtime via Settings (app-settings.ts → setSyncEnabled).
  syncEnabled: true,
  sync: { pushEvents, pullEvents },

  // Dynamic imports keep SSR bundles from loading wa-sqlite/OPFS until first ensureDb().
  load: async () => {
    const { createCollection } = await import("@tanstack/react-db");
    const {
      BrowserCollectionCoordinator,
      createBrowserWASQLitePersistence,
      openBrowserWASQLiteOPFSDatabase,
      persistedCollectionOptions,
    } = await import("@tanstack/browser-db-sqlite-persistence");

    return {
      openBrowserWASQLiteOPFSDatabase,
      createBrowserWASQLitePersistence,
      BrowserCollectionCoordinator,
      createCollection,
      persistedCollectionOptions,
    };
  },
});

export { db, ensureDb };
