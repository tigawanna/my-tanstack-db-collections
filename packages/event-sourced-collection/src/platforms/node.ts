import type { PersistedCollectionPersistence } from "../core/types";

export type NodePlatformDeps = {
  createNodeSQLitePersistence: (options: { database: never }) => PersistedCollectionPersistence;
};

export type NodePlatformConfig = {
  database: unknown;
};

export type NodePlatformResult = {
  persistence: PersistedCollectionPersistence;
};

/**
 * Wraps an already-opened better-sqlite3 database as TanStack persistence.
 * Prefer {@link createNodeEventSourcedDB}; this is the persistence step it uses.
 *
 * @example
 * ```ts
 * import { createCollection } from "@tanstack/db"
 * import { createNodeSQLitePersistence, persistedCollectionOptions } from "@tanstack/node-db-sqlite-persistence"
 * import Database from "better-sqlite3"
 * import { createNodePlatform } from "event-sourced-collection/node"
 * import { createEventSourcedDB } from "event-sourced-collection"
 *
 * const sqlite = new Database("app.sqlite")
 * const { persistence } = createNodePlatform(
 *   { createNodeSQLitePersistence },
 *   { database: sqlite },
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
export function createNodePlatform(
  deps: NodePlatformDeps,
  config: NodePlatformConfig,
): NodePlatformResult {
  return {
    persistence: deps.createNodeSQLitePersistence({
      database: config.database as never,
    }),
  };
}
