import type { PersistedCollectionPersistence, SQLiteDriver } from "../types";

export type ReactNativePlatformDeps = {
  createReactNativeSQLitePersistence: (options: {
    database: SQLiteDriver;
  }) => PersistedCollectionPersistence;
};

export type ReactNativePlatformConfig = {
  database: SQLiteDriver;
};

export type ReactNativePlatformResult = {
  driver: SQLiteDriver;
  persistence: PersistedCollectionPersistence;
};

export function createReactNativePlatform(
  deps: ReactNativePlatformDeps,
  config: ReactNativePlatformConfig,
): ReactNativePlatformResult {
  const persistence = deps.createReactNativeSQLitePersistence({
    database: config.database,
  });

  return {
    driver: config.database,
    persistence,
  };
}
