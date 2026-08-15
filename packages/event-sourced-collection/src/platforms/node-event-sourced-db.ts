import {
  createEventSourcedDBHandle,
  resolveModules,
  type ModulesInput,
} from "../create-event-sourced-db-handle";
import type {
  CreateCollectionFn,
  InjectedCreateCollection,
  InjectedModuleFn,
  PersistedCollectionOptionsFn,
} from "../persisted-collection";
import type { EventSourcedSharedOptions, PersistedCollectionPersistence } from "../types";
import { createNodePlatform } from "./node";

type CollectionDefConstraint = {
  getKey: (state: never) => string | number;
};

export type NodeEventSourcedModules = {
  createNodeSQLitePersistence: (options: { database: never }) => PersistedCollectionPersistence;
  /** Already-opened better-sqlite3 (or compatible) database. */
  database: unknown;
  createCollection: InjectedCreateCollection;
  persistedCollectionOptions: InjectedModuleFn;
};

export type NodeEventSourcedDBConfig<TDefs extends Record<string, CollectionDefConstraint>> =
  EventSourcedSharedOptions & {
    collections: TDefs;
    /**
     * Node persistence modules. Pass the imported bindings directly, or a
     * function if you still want to delay loading `better-sqlite3`.
     */
    modules: ModulesInput<NodeEventSourcedModules>;
  };

export function createNodeEventSourcedDB<
  const TDefs extends Record<string, CollectionDefConstraint>,
>(config: NodeEventSourcedDBConfig<TDefs>) {
  return createEventSourcedDBHandle<TDefs>({
    setup: async () => {
      const modules = await resolveModules(config.modules);
      const platform = createNodePlatform(
        { createNodeSQLitePersistence: modules.createNodeSQLitePersistence },
        { database: modules.database },
      );

      return {
        persistence: platform.persistence,
        createCollection: modules.createCollection as CreateCollectionFn,
        persistedCollectionOptions:
          modules.persistedCollectionOptions as PersistedCollectionOptionsFn,
        collections: config.collections,
        sync: config.sync,
        syncEnabled: config.syncEnabled,
        schemaVersion: config.schemaVersion,
        debug: config.debug,
        clientId: config.clientId,
        unknownEventHandling: config.unknownEventHandling,
        pullOverlap: config.pullOverlap,
        eventSchemaVersion: config.eventSchemaVersion,
        upcastEvent: config.upcastEvent,
        retry: config.retry,
        pushBatchSize: config.pushBatchSize,
        backendMismatch: config.backendMismatch,
        conflictDetection: config.conflictDetection,
        hooks: config.hooks,
        lock: config.lock,
        lockName: config.lockName,
        close: () => {
          const database = modules.database as { close?: () => void };
          database.close?.();
        },
      };
    },
  });
}
