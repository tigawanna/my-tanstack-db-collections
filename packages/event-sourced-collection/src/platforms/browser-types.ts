import type { PersistedCollectionPersistence } from "@tanstack/db-sqlite-persistence-core";
import type { BrowserWASQLiteDatabase } from "./browser-wa-sqlite-driver";

export type BrowserCoordinatorInstance = {
  dispose: () => void;
};

/**
 * Injected TanStack browser persistence bindings. Parameters are `never` so
 * version-skewed `@tanstack/browser-db-sqlite-persistence` exports stay assignable.
 */
export type BrowserPlatformDeps = {
  openBrowserWASQLiteOPFSDatabase: (options: never) => Promise<BrowserWASQLiteDatabase>;
  createBrowserWASQLitePersistence: (options: never) => PersistedCollectionPersistence;
  BrowserCollectionCoordinator: new (options: never) => BrowserCoordinatorInstance;
};

export type BrowserPlatformConfig = {
  databaseName: string;
  coordinatorDbName?: string;
};

export type BrowserPlatformResult = {
  driver: import("../types").SQLiteDriver;
  persistence: PersistedCollectionPersistence;
  close: () => Promise<void>;
};
