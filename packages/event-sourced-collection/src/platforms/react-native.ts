import type { PersistedCollectionPersistence } from "../types";

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
