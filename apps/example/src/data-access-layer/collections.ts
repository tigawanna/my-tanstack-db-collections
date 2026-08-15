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
 * - `db.collections.deadletter` — permanently rejected / exhausted retries
 * - `db.collections.syncmeta` — pull cursor + backend identity
 * - `db.collections.rowversions` — per-row versions when conflictDetection is on
 */

import { BasicIndex } from "@tanstack/db";
import { createBrowserEventSourcedDB } from "event-sourced-collection/browser";
import type {
  CollectionDef,
  EventSourcedDB,
  EventSourcedHooks,
  OutboundEvent,
  PullResponse,
  PushResponse,
} from "event-sourced-collection";
import { toast } from "sonner";

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

const CLIENT_ID_STORAGE_KEY = "example-sync-client-id";

/** Stable device id across reloads so the server can attribute events. */
function getPersistedClientId(): string | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const existing = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (existing) return existing;

    const created = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

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

/**
 * Observe-only lifecycle hooks. Throws are swallowed by the package so these
 * must never drive control flow — toast / log only.
 */
const syncHooks: EventSourcedHooks = {
  onReady: ({ clientId, pullCursor }) => {
    if (import.meta.env.DEV) {
      console.info("[sync] ready", { clientId, pullCursor });
    }
  },
  onSyncError: ({ phase, error }) => {
    toast.error(`Sync ${phase} failed`, { description: error.message });
  },
  onDeadLetter: (entry) => {
    toast.warning("Event moved to dead letter", {
      description: `${entry.collectionId}/${String(entry.key)} — ${entry.message}`,
    });
  },
  onBackendMismatch: ({ expected, received, policy }) => {
    toast.message("Sync backend changed", {
      description: `Expected ${expected ?? "none"}, got ${received} (policy: ${policy}).`,
    });
  },
  onSyncComplete: ({ trigger, result }) => {
    if (!import.meta.env.DEV) return;
    if (result.deferred || result.errors.length > 0) return;
    if (result.pushed === 0 && result.pulled === 0 && result.deadLettered === 0) return;
    console.info(`[sync] ${trigger} complete`, result);
  },
};

// Lazy singleton: ensureDb() opens SQLite once; db proxy forwards after init.
const { ensureDb, db } = createBrowserEventSourcedDB<AppCollectionDefs>({
  databaseName: "my-app.sqlite",
  debug: import.meta.env.DEV,
  clientId: getPersistedClientId(),

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

  // Stamp payload shape version; pair with upcastEvent when you evolve row schemas.
  eventSchemaVersion: 1,

  // Re-pull a few seqs on every sync. Harmless (replay is idempotent); useful if
  // the server ever assigns sequences before commit (Postgres BIGSERIAL). Our
  // libsql server uses BEGIN IMMEDIATE, so this is belt-and-suspenders.
  pullOverlap: 5,

  // Stamp baseVersion on writes; server rejects stale edits with CONFLICT.
  conflictDetection: true,

  // Permanent failures and exhausted retries land in deadletter (see Events UI).
  retry: {
    maxAttempts: 8,
    baseDelayMs: 1_000,
    maxDelayMs: 5 * 60_000,
  },
  pushBatchSize: 100,

  // Recreated server DB → new backendId → reset pull cursor and re-sync from 0.
  backendMismatch: "resetCursor",

  hooks: syncHooks,

  // Function form keeps SSR bundles from loading wa-sqlite/OPFS until first ensureDb().
  modules: async () => {
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
