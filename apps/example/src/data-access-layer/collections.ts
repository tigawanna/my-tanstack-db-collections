import { createBrowserEventSourcedDB } from "event-sourced-collection/browser";
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

const { ensureDb, db } = createBrowserEventSourcedDB<AppCollectionDefs>({
  databaseName: "my-app.sqlite",
  debug: import.meta.env.DEV,
  collections: {
    users: { getKey: (user: User) => user.id },
    todos: { getKey: (todo: Todo) => todo.id },
    settings: { getKey: (settings: AppSettings) => settings.id },
  },
  sync: { pushEvents, pullEvents },
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
