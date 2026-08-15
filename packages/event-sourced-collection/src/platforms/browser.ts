import { BrowserWASQLiteDriver } from "./browser-wa-sqlite-driver";
import type {
  BrowserPlatformConfig,
  BrowserPlatformDeps,
  BrowserPlatformResult,
} from "./browser-types";

export type {
  BrowserCoordinatorInstance,
  BrowserPlatformConfig,
  BrowserPlatformDeps,
  BrowserPlatformResult,
} from "./browser-types";

export type { BrowserWASQLiteDatabase } from "./browser-wa-sqlite-driver";

export async function createBrowserPlatform(
  deps: BrowserPlatformDeps,
  config: BrowserPlatformConfig,
): Promise<BrowserPlatformResult> {
  const database = await deps.openBrowserWASQLiteOPFSDatabase({
    databaseName: config.databaseName,
  } as never);

  const coordinator = new deps.BrowserCollectionCoordinator({
    dbName: config.coordinatorDbName ?? config.databaseName.replace(/\.sqlite$/, ""),
  } as never);

  const persistence = deps.createBrowserWASQLitePersistence({
    database,
    coordinator,
  } as never);

  const driver = new BrowserWASQLiteDriver(database);

  return {
    driver,
    persistence,
    close: async () => {
      coordinator.dispose();
      await driver.close();
    },
  };
}
