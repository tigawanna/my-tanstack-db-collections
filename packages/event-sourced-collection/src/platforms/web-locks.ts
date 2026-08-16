import type { SyncLock } from "../core/types";

type LockManager = {
  request: (
    name: string,
    options: { ifAvailable: true },
    callback: (lock: unknown) => Promise<unknown>,
  ) => Promise<unknown>;
};

function getLockManager(): LockManager | null {
  const candidate = (globalThis as { navigator?: { locks?: LockManager } }).navigator?.locks;
  return candidate && typeof candidate.request === "function" ? candidate : null;
}

/**
 * True when `navigator.locks` is available (modern browsers / workers).
 *
 * @example
 * ```ts
 * import { createWebLocksSyncLock, supportsWebLocks } from "event-sourced-collection"
 * import { createBrowserEventSourcedDB } from "event-sourced-collection/browser"
 *
 * const lock = supportsWebLocks() ? createWebLocksSyncLock() : undefined
 *
 * createBrowserEventSourcedDB({
 *   databaseName: "app.sqlite",
 *   lock: lock ?? null,
 *   collections: { todos: { getKey: (todo: { id: string }) => todo.id } },
 *   modules,
 * })
 * ```
 */
export function supportsWebLocks(): boolean {
  return getLockManager() !== null;
}

/**
 * Leader election backed by the Web Locks API, so only one tab or worker syncs
 * at a time. Uses `ifAvailable` rather than queueing: a tab that loses the race
 * returns immediately instead of running a redundant sync afterwards.
 *
 * Falls back to always acquiring when Web Locks is unavailable (older browsers,
 * non-browser runtimes), which preserves single-context behaviour.
 *
 * `createBrowserEventSourcedDB` installs this as the default `lock`. Pass
 * `lock: null` there to opt out.
 *
 * @example Only one tab runs `sync()`
 * ```ts
 * import { createWebLocksSyncLock, supportsWebLocks } from "event-sourced-collection"
 *
 * const lock = createWebLocksSyncLock()
 *
 * async function syncIfLeader() {
 *   const outcome = await lock.tryRun("event-sourced-sync:app.sqlite", () => db.sync())
 *   if (!outcome.acquired) return // another tab already holds the lock
 *   return outcome.result
 * }
 *
 * if (!supportsWebLocks()) {
 *   // Node / older browsers: tryRun always acquires
 * }
 * ```
 */
export function createWebLocksSyncLock(): SyncLock {
  return {
    tryRun: async <T>(name: string, fn: () => Promise<T>) => {
      const locks = getLockManager();

      if (!locks) {
        return { acquired: true as const, result: await fn() };
      }

      const NOT_ACQUIRED = Symbol("not-acquired");

      const outcome = await locks.request(name, { ifAvailable: true }, async (lock) => {
        if (!lock) return NOT_ACQUIRED;
        return fn();
      });

      if (outcome === NOT_ACQUIRED) {
        return { acquired: false as const };
      }

      return { acquired: true as const, result: outcome as T };
    },
  };
}
