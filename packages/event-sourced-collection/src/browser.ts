export { createBrowserPlatform } from "./platforms/browser";
export type {
  BrowserCoordinatorInstance,
  BrowserPlatformConfig,
  BrowserPlatformDeps,
  BrowserPlatformResult,
} from "./platforms/browser";
export type { BrowserWASQLiteDatabase } from "./platforms/browser";
export { createBrowserEventSourcedDB } from "./platforms/browser-event-sourced-db";
export type {
  BrowserEventSourcedDBConfig,
  BrowserEventSourcedDBHandle,
  BrowserEventSourcedModules,
} from "./platforms/browser-event-sourced-db";
