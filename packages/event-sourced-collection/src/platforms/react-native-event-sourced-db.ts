import { createEventSourcedDB } from "../create-event-sourced-db";
import { createLazySingleton } from "../lazy-singleton";
import type { CreateCollectionFn, PersistedCollectionOptionsFn } from "../persisted-collection";
import type { EventSourcedDB, EventSourcedSharedOptions, SQLiteDriver } from "../types";
import { createReactNativePlatform } from "./react-native";
import type { ReactNativePlatformDeps } from "./react-native";

type CollectionDefConstraint = {
  getKey: (state: never) => string | number;
  schemaVersion?: number;
  indexes?: ReadonlyArray<{
    select: (row: never) => unknown;
    name?: string;
    indexType?: import("@tanstack/db").IndexConstructor<string | number>;
  }>;
};

export type ReactNativeEventSourcedModules = ReactNativePlatformDeps & {
  /** Already-opened SQLite driver instance for this app. */
  database: SQLiteDriver;
  createCollection: CreateCollectionFn;
  persistedCollectionOptions: PersistedCollectionOptionsFn;
};

/**
 * React Native entry-point config. Shared sync/lifecycle fields come from
 * {@link EventSourcedSharedOptions} (hover those properties for docs).
 * Deep guide: `docs/usage.md`.
 */
export type ReactNativeEventSourcedDBConfig<TDefs extends Record<string, CollectionDefConstraint>> =
  EventSourcedSharedOptions & {
    /**
     * User collection registry. Object keys become `db.collections.<key>` and
     * the wire `collectionId`. Must not collide with reserved names.
     */
    collections: TDefs;
    /**
     * Lazy-loads RN platform modules (`createReactNativeSQLitePersistence`, the
     * opened `database` driver, `createCollection`, `persistedCollectionOptions`).
     * Prefer a dynamic `import()` so native SQLite bindings stay out of unused
     * bundles.
     */
    load: () => Promise<ReactNativeEventSourcedModules>;
  };

export type ReactNativeEventSourcedDBHandle<TDefs extends Record<string, CollectionDefConstraint>> =
  {
    /** Opens (or returns) the singleton DB. Call once at app startup before using `db`. */
    ensureDb: () => Promise<EventSourcedDB<TDefs>>;
    /**
     * Proxy that forwards to the live DB after `ensureDb()` resolves. Accessing a
     * property before initialization throws.
     */
    db: EventSourcedDB<TDefs>;
    /** Disposes the DB and resets the singleton. */
    close: () => Promise<void>;
  };

/**
 * React Native–flavoured event-sourced DB, returned as a lazy singleton.
 *
 * @param config - See {@link ReactNativeEventSourcedDBConfig} for every option.
 */
export function createReactNativeEventSourcedDB<
  const TDefs extends Record<string, CollectionDefConstraint>,
>(config: ReactNativeEventSourcedDBConfig<TDefs>): ReactNativeEventSourcedDBHandle<TDefs> {
  let activeDb: EventSourcedDB<TDefs> | null = null;

  const factory = async (): Promise<EventSourcedDB<TDefs>> => {
    const modules = await config.load();

    const platform = createReactNativePlatform(
      { createReactNativeSQLitePersistence: modules.createReactNativeSQLitePersistence },
      { database: modules.database },
    );

    const database = await createEventSourcedDB<TDefs>({
      persistence: platform.persistence,
      createCollection: modules.createCollection,
      persistedCollectionOptions: modules.persistedCollectionOptions,
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
    });

    activeDb = database;
    return database;
  };

  const singleton = createLazySingleton<EventSourcedDB<TDefs>>(factory, {
    notInitializedMessage: "Event-sourced DB is not initialized. Call ensureDb() before using db.",
  });

  const close = async (): Promise<void> => {
    if (activeDb) {
      activeDb.dispose();
      activeDb = null;
    }
    singleton.reset();
  };

  return {
    ensureDb: singleton.ensure,
    db: singleton.proxy,
    close,
  };
}
