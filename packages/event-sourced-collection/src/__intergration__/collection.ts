import { BasicIndex } from "@tanstack/db";
import { createCollection } from "@tanstack/db";
import {
  createNodeSQLitePersistence,
  persistedCollectionOptions,
} from "@tanstack/node-db-sqlite-persistence";
import Database from "better-sqlite3";
import type {
  CollectionDef,
  EventSourcedDB,
  OutboundEvent,
  PullResponse,
  PushResponse,
} from "../types";
import { createNodeEventSourcedDB } from "../node";

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

async function pushEvents(events: ReadonlyArray<OutboundEvent>): Promise<PushResponse> {
  const response = await fetch("/api/sync/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(events),
  });
  if (!response.ok) throw new Error(`Push failed: ${response.status}`);
  return response.json();
}

async function pullEvents({ since }: { since: number }): Promise<PullResponse> {
  const response = await fetch(`/api/sync/events?since=${since}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Pull failed: ${response.status}`);
  return response.json();
}

const sqlite = new Database("my-app.sqlite");

const { ensureDb, db } = createNodeEventSourcedDB<AppCollectionDefs>({
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

  syncEnabled: true,
  sync: { pushEvents, pullEvents },

  modules: {
    database: sqlite,
    createNodeSQLitePersistence,
    createCollection,
    persistedCollectionOptions,
  },
});

export { db, ensureDb };
