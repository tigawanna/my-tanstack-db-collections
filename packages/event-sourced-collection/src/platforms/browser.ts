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

/**
 * Opens OPFS SQLite, a cross-tab coordinator, and TanStack persistence.
 * Prefer {@link createBrowserEventSourcedDB}; call this only when you need the
 * raw `persistence` / `close` pair (for example a custom handle).
 *
 * @example
 * ```ts
 * import { createBrowserPlatform } from "event-sourced-collection/browser"
 * import {
 *   BrowserCollectionCoordinator,
 *   createBrowserWASQLitePersistence,
 *   openBrowserWASQLiteOPFSDatabase,
 * } from "@tanstack/browser-db-sqlite-persistence"
 *
 * const platform = await createBrowserPlatform(
 *   {
 *     openBrowserWASQLiteOPFSDatabase,
 *     createBrowserWASQLitePersistence,
 *     BrowserCollectionCoordinator,
 *   },
 *   { databaseName: "app.sqlite" },
 * )
 *
 * // pass platform.persistence into createEventSourcedDB
 * await platform.close()
 * ```
 */
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
