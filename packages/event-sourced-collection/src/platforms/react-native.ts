import type { PersistedCollectionPersistence } from "../core/types";

export type ReactNativePlatformDeps = {
  createReactNativeSQLitePersistence: (options: {
    database: never;
  }) => PersistedCollectionPersistence;
};

export type ReactNativePlatformConfig = {
  database: unknown;
};

export type ReactNativePlatformResult = {
  persistence: PersistedCollectionPersistence;
};

/**
 * Wraps an already-opened native SQLite database as TanStack persistence.
 * Prefer {@link createReactNativeEventSourcedDB}; this is the persistence step it uses.
 *
 * @example
 * ```ts
 * import { createCollection } from "@tanstack/react-native-db"
 * import {
 *   createReactNativeSQLitePersistence,
 *   persistedCollectionOptions,
 * } from "@tanstack/react-native-db-sqlite-persistence"
 * import { openDatabase } from "react-native-op-sqlite"
 * import { createReactNativePlatform } from "event-sourced-collection/react-native"
 * import { createEventSourcedDB } from "event-sourced-collection"
 *
 * const database = openDatabase({ name: "app.sqlite" })
 * const { persistence } = createReactNativePlatform(
 *   { createReactNativeSQLitePersistence },
 *   { database },
 * )
 *
 * const db = await createEventSourcedDB({
 *   persistence,
 *   createCollection,
 *   persistedCollectionOptions,
 *   collections: { todos: { getKey: (todo: { id: string }) => todo.id } },
 * })
 * ```
 */
export function createReactNativePlatform(
  deps: ReactNativePlatformDeps,
  config: ReactNativePlatformConfig,
): ReactNativePlatformResult {
  return {
    persistence: deps.createReactNativeSQLitePersistence({
      database: config.database as never,
    }),
  };
}
