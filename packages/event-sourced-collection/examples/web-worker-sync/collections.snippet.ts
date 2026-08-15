/**
 * Snippet — wire a worker-backed SyncTransport into createBrowserEventSourcedDB.
 * Not imported by the package build; copy into your app's collections.ts.
 */
import { createBrowserEventSourcedDB } from "event-sourced-collection/browser";
import type { CollectionDef } from "event-sourced-collection";

import { createWorkerSyncTransport } from "./create-worker-sync-transport";

type Todo = {
  id: string;
  title: string;
};

type AppCollectionDefs = {
  todos: CollectionDef<Todo, string>;
};

const syncWorker = new Worker(new URL("./sync.worker.ts", import.meta.url), {
  type: "module",
});

const sync = createWorkerSyncTransport({
  worker: syncWorker,
  pushUrl: "/api/sync/events",
  pullUrl: "/api/sync/events",
  getHeaders: () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken") ?? ""}`,
  }),
});

const { ensureDb, db } = createBrowserEventSourcedDB<AppCollectionDefs>({
  databaseName: "my-app.sqlite",
  collections: {
    todos: { getKey: (todo: Todo) => todo.id },
  },
  sync,
  load: async () => {
    const { createCollection } = await import("@tanstack/db");
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
      persistedCollectionOptions,
      createCollection,
    };
  },
});

export { db, ensureDb };
