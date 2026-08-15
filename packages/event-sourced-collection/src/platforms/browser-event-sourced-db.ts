import { createEventSourcedDB } from "../create-event-sourced-db";
import { createLazySingleton } from "../lazy-singleton";
import type { CreateCollectionFn, PersistedCollectionOptionsFn } from "../persisted-collection";
import type { EventSourcedDB, EventSourcedSharedOptions, SyncLock } from "../types";
import { createBrowserPlatform } from "./browser";
import type { BrowserPlatformDeps } from "./browser-types";
import { createWebLocksSyncLock } from "./web-locks";

type CollectionDefConstraint = {
  getKey: (state: never) => string | number;
  schemaVersion?: number;
  indexes?: ReadonlyArray<{
    select: (row: never) => unknown;
    name?: string;
    indexType?: import("@tanstack/db").IndexConstructor<string | number>;
  }>;
};

export type BrowserEventSourcedModules = BrowserPlatformDeps & {
  createCollection: CreateCollectionFn;
  persistedCollectionOptions: PersistedCollectionOptionsFn;
};

/**
 * Browser entry-point config. Shared sync/lifecycle fields come from
 * {@link EventSourcedSharedOptions} (hover those properties for docs).
 * Deep guide: `docs/usage.md`.
 */
export type BrowserEventSourcedDBConfig<TDefs extends Record<string, CollectionDefConstraint>> =
  Omit<EventSourcedSharedOptions, "lock" | "lockName"> & {
    /**
     * User collection registry. Object keys become `db.collections.<key>` and
     * the wire `collectionId`. Must not collide with reserved names.
     */
    collections: TDefs;
    /**
     * OPFS SQLite database file name (e.g. `"my-app.sqlite"`). Also used as the
     * default sync lock namespace so only one tab syncs for this DB at a time.
     */
    databaseName: string;
    /**
     * Name for the cross-tab collection coordinator database. Defaults to
     * `databaseName` with a trailing `.sqlite` stripped.
     */
    coordinatorDbName?: string;
    /**
     * Lazy-loads browser platform modules (`openBrowserWASQLiteOPFSDatabase`,
     * `createBrowserWASQLitePersistence`, `BrowserCollectionCoordinator`,
     * `createCollection`, `persistedCollectionOptions`). Call this from a
     * dynamic `import()` so the SQLite WASM payload stays out of the critical path.
     */
    load: () => Promise<BrowserEventSourcedModules>;
    /**
     * Defaults to a Web Locks–backed lock so only one tab syncs at a time.
     * Pass `null` to opt out and let every tab sync independently.
     */
    lock?: SyncLock | null;
  };

export type BrowserEventSourcedDBHandle<TDefs extends Record<string, CollectionDefConstraint>> = {
  /** Opens (or returns) the singleton DB. Call once at app startup before using `db`. */
  ensureDb: () => Promise<EventSourcedDB<TDefs>>;
  /**
   * Proxy that forwards to the live DB after `ensureDb()` resolves. Accessing a
   * property before initialization throws.
   */
  db: EventSourcedDB<TDefs>;
  /** Disposes the DB, closes the platform, and resets the singleton. */
  close: () => Promise<void>;
};

/**
 * Browser-flavoured event-sourced DB: OPFS SQLite + optional Web Locks sync
 * election, returned as a lazy singleton.
 *
 * @param config - See {@link BrowserEventSourcedDBConfig} for every option.
 */
export function createBrowserEventSourcedDB<
  const TDefs extends Record<string, CollectionDefConstraint>,
>(config: BrowserEventSourcedDBConfig<TDefs>): BrowserEventSourcedDBHandle<TDefs> {
  let activeDb: EventSourcedDB<TDefs> | null = null;
  let closePlatform: (() => Promise<void>) | null = null;

  const factory = async (): Promise<EventSourcedDB<TDefs>> => {
    const modules = await config.load();

    const platform = await createBrowserPlatform(
      {
        openBrowserWASQLiteOPFSDatabase: modules.openBrowserWASQLiteOPFSDatabase,
        createBrowserWASQLitePersistence: modules.createBrowserWASQLitePersistence,
        BrowserCollectionCoordinator: modules.BrowserCollectionCoordinator,
      },
      {
        databaseName: config.databaseName,
        coordinatorDbName: config.coordinatorDbName,
      },
    );

    closePlatform = platform.close;

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
      lock: config.lock === null ? undefined : (config.lock ?? createWebLocksSyncLock()),
      lockName: config.databaseName,
    });

    activeDb = database;
    return database;
  };

  const singleton = createLazySingleton<EventSourcedDB<TDefs>>(factory, {
    guard: assertBrowserEnvironment,
    notInitializedMessage: "Event-sourced DB is not initialized. Call ensureDb() before using db.",
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

function assertBrowserEnvironment(): void {
  if (typeof window === "undefined") {
    throw new Error("Event-sourced DB (browser) is only available in a browser environment.");
  }
}
