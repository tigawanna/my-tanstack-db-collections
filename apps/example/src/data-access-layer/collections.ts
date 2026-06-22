type User = {
  id: string;
  name: string;
  email: string;
  createdAt: number;
};

type Todo = {
  id: string;
  userId: string;
  title: string;
  status: "pending" | "complete";
  createdAt: number;
  updatedAt: number;
};

type AppSettings = {
  id: string;
  theme: "light" | "dark";
  language: string;
};

import { createCollection } from "@tanstack/react-db";
import {
  BrowserCollectionCoordinator,
  createBrowserWASQLitePersistence,
  openBrowserWASQLiteOPFSDatabase,
  persistedCollectionOptions,
} from "@tanstack/browser-db-sqlite-persistence";
import {
  createEventSourcedDB,
  createBrowserPlatform,
} from "@tanstack-db-collections/event-sourced";

const getAccessToken = (): string => localStorage.getItem("accessToken") ?? "";

const platform = await createBrowserPlatform(
  {
    openBrowserWASQLiteOPFSDatabase,
    createBrowserWASQLitePersistence,
    BrowserCollectionCoordinator,
  },
  { databaseName: "my-app.sqlite" },
);

const db = await createEventSourcedDB({
  driver: platform.driver,
  persistence: platform.persistence,
  createCollection,
  persistedCollectionOptions,
  sync: {
    push: "/api/events",
    pull: "/api/events",
    headers: () => ({ Authorization: `Bearer ${getAccessToken()}` }),
  },
  collections: {
    users: { getKey: (u: User) => u.id },
    todos: { getKey: (t: Todo) => t.id },
    settings: { getKey: (s: AppSettings) => s.id },
  },
});
