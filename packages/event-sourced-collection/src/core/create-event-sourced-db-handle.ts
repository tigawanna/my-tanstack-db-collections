import { createEventSourcedDB } from "./create-event-sourced-db";
import { createLazySingleton } from "./lazy-singleton";
import type { EventSourcedDB, EventSourcedDBConfig } from "./types";

type CollectionDefConstraint = {
  getKey: (state: never) => string | number;
};

/**
 * Lazy handle returned by platform helpers and {@link createEventSourcedDBHandle}.
 *
 * @example
 * ```ts
 * import { createBrowserEventSourcedDB } from "event-sourced-collection/browser"
 *
 * const { ensureDb, db, close } = createBrowserEventSourcedDB({
 *   databaseName: "app.sqlite",
 *   collections: { todos: { getKey: (todo: { id: string }) => todo.id } },
 *   modules: async () => {
 *     const { createCollection } = await import("@tanstack/db")
 *     const persistence = await import("@tanstack/browser-db-sqlite-persistence")
 *     return { createCollection, ...persistence }
 *   },
 * })
 *
 * await ensureDb()
 * await db.collections.todos.insert({ id: "t1" }).isPersisted.promise
 * await close()
 * ```
 */
export type EventSourcedDBHandle<TDefs extends Record<string, CollectionDefConstraint>> = {
  /** Opens (or returns) the singleton DB. Call once at app startup before using `db`. */
  ensureDb: () => Promise<EventSourcedDB<TDefs>>;
  /**
   * Proxy that forwards to the live DB after `ensureDb()` resolves. Accessing a
   * property before initialization throws.
   */
  db: EventSourcedDB<TDefs>;
  /** Disposes the DB, runs platform cleanup, and resets the singleton. */
  close: () => Promise<void>;
};

export type EventSourcedDBHandleSetup<TDefs extends Record<string, CollectionDefConstraint>> =
  EventSourcedDBConfig<TDefs> & {
    /** Optional platform teardown (close SQLite, dispose coordinators). */
    close?: () => Promise<void> | void;
  };

/**
 * Lazy singleton around {@link createEventSourcedDB}. Platform helpers use this
 * after they have turned TanStack persistence modules into `persistence`.
 * Call this yourself only when you need a custom open/close path.
 *
 * @example Custom persistence, still lazy like the platform helpers
 * ```ts
 * import { createCollection } from "@tanstack/db"
 * import {
 *   createNodeSQLitePersistence,
 *   persistedCollectionOptions,
 * } from "@tanstack/node-db-sqlite-persistence"
 * import Database from "better-sqlite3"
 * import { createEventSourcedDBHandle } from "event-sourced-collection"
 *
 * type Todo = { id: string; title: string }
 *
 * const { ensureDb, db, close } = createEventSourcedDBHandle({
 *   setup: async () => {
 *     const sqlite = new Database("app.sqlite")
 *     return {
 *       persistence: createNodeSQLitePersistence({ database: sqlite }),
 *       createCollection,
 *       persistedCollectionOptions,
 *       collections: { todos: { getKey: (todo: Todo) => todo.id } },
 *       close: () => sqlite.close(),
 *     }
 *   },
 * })
 *
 * await ensureDb()
 * console.log(db.collections.todos.size)
 * await close()
 * ```
 */
export function createEventSourcedDBHandle<
  const TDefs extends Record<string, CollectionDefConstraint>,
>(options: {
  setup: () => Promise<EventSourcedDBHandleSetup<TDefs>>;
  guard?: () => void;
  notInitializedMessage?: string;
}): EventSourcedDBHandle<TDefs> {
  let activeDb: EventSourcedDB<TDefs> | null = null;
  let closePlatform: (() => Promise<void> | void) | null = null;

  const factory = async (): Promise<EventSourcedDB<TDefs>> => {
    const { close, ...dbConfig } = await options.setup();
    closePlatform = close ?? null;
    const database = await createEventSourcedDB<TDefs>(dbConfig);
    activeDb = database;
    return database;
  };

  const singleton = createLazySingleton<EventSourcedDB<TDefs>>(factory, {
    guard: options.guard,
    notInitializedMessage:
      options.notInitializedMessage ??
      "Event-sourced DB is not initialized. Call ensureDb() before using db.",
  });

  const close = async (): Promise<void> => {
    if (activeDb) {
      activeDb.dispose();
      activeDb = null;
    }
    if (closePlatform) {
      await closePlatform();
      closePlatform = null;
    }
    singleton.reset();
  };

  return {
    ensureDb: singleton.ensure,
    db: singleton.proxy,
    close,
  };
}

/** Bindings object, or a function that loads them on first `ensureDb()`. */
export type ModulesInput<T> = T | (() => T | Promise<T>);

/**
 * Resolves {@link ModulesInput}: returns the object, or awaits the loader.
 *
 * @example Keep WASM off the SSR bundle until the first `ensureDb()`
 * ```ts
 * import { resolveModules, type ModulesInput } from "event-sourced-collection"
 *
 * type BrowserModules = {
 *   createCollection: typeof import("@tanstack/db").createCollection
 * }
 *
 * const modules: ModulesInput<BrowserModules> = async () => {
 *   const { createCollection } = await import("@tanstack/db")
 *   return { createCollection }
 * }
 *
 * const resolved = await resolveModules(modules)
 * ```
 */
export async function resolveModules<T>(modules: ModulesInput<T>): Promise<T> {
  return typeof modules === "function" ? await (modules as () => T | Promise<T>)() : modules;
}
