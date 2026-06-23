import type {
  EventSourcedDB,
  OutboundEvent,
  PullResponse,
  PushResponse,
} from "event-sourced-collection";

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

export type AppSettings = {
  id: string;
  theme: "light" | "dark";
  language: string;
};

type AppCollectionDefs = {
  users: { getKey: (user: User) => string };
  todos: { getKey: (todo: Todo) => string };
  settings: { getKey: (settings: AppSettings) => string };
};

export type AppDb = EventSourcedDB<AppCollectionDefs>;

let dbInstance: AppDb | null = null;
let initPromise: Promise<AppDb> | null = null;

const getAccessToken = (): string => localStorage.getItem("accessToken") ?? "";

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

async function initDb(): Promise<AppDb> {
  const { createCollection } = await import("@tanstack/react-db");
  const {
    BrowserCollectionCoordinator,
    createBrowserWASQLitePersistence,
    openBrowserWASQLiteOPFSDatabase,
    persistedCollectionOptions,
  } = await import("@tanstack/browser-db-sqlite-persistence");
  const { createEventSourcedDB } = await import("event-sourced-collection");
  const { createBrowserPlatform } = await import("event-sourced-collection/browser");

  const platform = await createBrowserPlatform(
    {
      openBrowserWASQLiteOPFSDatabase,
      createBrowserWASQLitePersistence,
      BrowserCollectionCoordinator,
    },
    { databaseName: "my-app.sqlite" },
  );

  return createEventSourcedDB({
    persistence: platform.persistence,
    createCollection,
    persistedCollectionOptions,
    debug: import.meta.env.DEV,
    sync: {
      pushEvents,
      pullEvents,
    },
    collections: {
      users: { getKey: (user: User) => user.id },
      todos: { getKey: (todo: Todo) => todo.id },
      settings: { getKey: (settings: AppSettings) => settings.id },
    },
  });
}

export async function ensureDb(): Promise<AppDb> {
  if (typeof window === "undefined") {
    throw new Error("Event-sourced DB is only available in the browser");
  }

  if (dbInstance) {
    return dbInstance;
  }

  if (!initPromise) {
    initPromise = initDb().then((instance) => {
      dbInstance = instance;
      return instance;
    });
  }

  return initPromise;
}

function getDb(): AppDb {
  if (!dbInstance) {
    throw new Error("Database is not initialized. Call ensureDb() first.");
  }

  return dbInstance;
}

export const db = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
