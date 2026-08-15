import { BasicIndex } from "@tanstack/db";
import type {
  CollectionDef,
  EventSourcedDB,
  OutboundEvent,
  PullResponse,
  PushResponse,
} from "event-sourced-collection";
import { createBrowserEventSourcedDB } from "event-sourced-collection/browser";

// --- Row types (one per collection) ---

export type User = { id: string; name: string; email: string; createdAt: number };
export type Todo = {
  id: string;
  userId: string;
  title: string;
  status: "pending" | "complete";
  createdAt: number;
  updatedAt: number;
};
// Singleton preferences row — use id "app" (see app-settings.ts)
export type AppSettings = {
  id: string;
  theme: "light" | "dark";
  language: string;
  syncEnabled: boolean;
};

type AppCollectionDefs = {
  users: CollectionDef<User, string>;
  todos: CollectionDef<Todo, string>;
  settings: CollectionDef<AppSettings, string>;
};

export type AppDb = EventSourcedDB<AppCollectionDefs>;

// --- Sync transport (runs when sync is enabled) ---

const getAccessToken = () => localStorage.getItem("accessToken") ?? "";

async function pushEvents(events: ReadonlyArray<OutboundEvent>): Promise<PushResponse> {
  const response = await fetch("/api/sync/events", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAccessToken()}` },
    body: JSON.stringify(events),
  });
  if (!response.ok) throw new Error(`Push failed: ${response.status}`);
  return response.json();
}

async function pullEvents({ since }: { since: number }): Promise<PullResponse> {
  const response = await fetch(`/api/sync/events?since=${since}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${getAccessToken()}` },
  });
  if (!response.ok) throw new Error(`Pull failed: ${response.status}`);
  return response.json();
}

// --- DB init: lazy singleton; db proxy forwards after ensureDb() ---

const { ensureDb, db } = createBrowserEventSourcedDB<AppCollectionDefs>({
  databaseName: "my-app.sqlite",
  //   debug: import.meta.env.DEV,

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

  syncEnabled: true, // initial default; users can toggle at runtime (see app-settings.ts)
  sync: { pushEvents, pullEvents },

  load: async () => {
    const { createCollection } = await import("@tanstack/db");
    // const {
    //   BrowserCollectionCoordinator,
    //   createBrowserWASQLitePersistence,
    //   openBrowserWASQLiteOPFSDatabase,
    //   persistedCollectionOptions,
    // } = await import("@tanstack/browser-db-sqlite-persistence");

    const {
      createNodeSQLitePersistence,
      DEFAULT_APPLIED_TX_PRUNE_MAX_AGE_SECONDS,
      DEFAULT_APPLIED_TX_PRUNE_MAX_ROWS,
      persistedCollectionOptions,
    } = await import("@tanstack/node-db-sqlite-persistence");

    // const {
    //   createReactNativeSQLitePersistence,
    //   DEFAULT_APPLIED_TX_PRUNE_MAX_AGE_SECONDS,
    //   DEFAULT_APPLIED_TX_PRUNE_MAX_ROWS,
    //   persistedCollectionOptions,
    // } = await import("@tanstack/react-native-db-sqlite-persistence");

    return {
      //   openBrowserWASQLiteOPFSDatabase,
      //   createBrowserWASQLitePersistence,
      //   BrowserCollectionCoordinator,
      createCollection,
      persistedCollectionOptions,
    };
  },
});

export { db, ensureDb };
