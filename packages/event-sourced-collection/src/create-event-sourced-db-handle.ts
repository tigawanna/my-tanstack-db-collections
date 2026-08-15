import { createEventSourcedDB } from "./create-event-sourced-db";
import { createLazySingleton } from "./lazy-singleton";
import type { EventSourcedDB, EventSourcedDBConfig } from "./types";

type CollectionDefConstraint = {
  getKey: (state: never) => string | number;
};

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

export type ModulesInput<T> = T | (() => T | Promise<T>);

export async function resolveModules<T>(modules: ModulesInput<T>): Promise<T> {
  return typeof modules === "function" ? await (modules as () => T | Promise<T>)() : modules;
}
