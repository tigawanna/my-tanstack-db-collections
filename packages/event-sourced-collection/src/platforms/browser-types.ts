import type {
  BrowserCollectionCoordinatorOptions,
  BrowserWASQLiteDatabase,
  BrowserWASQLitePersistenceOptions,
  OpenBrowserWASQLiteOPFSDatabaseOptions,
} from "@tanstack/browser-db-sqlite-persistence";
import type {
  PersistedCollectionCoordinator,
  PersistedCollectionPersistence,
} from "@tanstack/db-sqlite-persistence-core";

export type BrowserCoordinatorInstance = PersistedCollectionCoordinator & {
  dispose: () => void;
};

export type BrowserPlatformDeps = {
  openBrowserWASQLiteOPFSDatabase: (
    options: OpenBrowserWASQLiteOPFSDatabaseOptions,
  ) => Promise<BrowserWASQLiteDatabase>;
  createBrowserWASQLitePersistence: (
    options: BrowserWASQLitePersistenceOptions,
  ) => PersistedCollectionPersistence;
  BrowserCollectionCoordinator: new (
    options: BrowserCollectionCoordinatorOptions,
  ) => BrowserCoordinatorInstance;
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
