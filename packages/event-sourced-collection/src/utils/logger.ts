export type EventSourcedLogLevel = "debug" | "info" | "warn" | "error";

/**
 * Structured logger used when `debug` is enabled on a DB factory.
 *
 * @example Custom sink
 * ```ts
 * import type { EventSourcedLogger } from "event-sourced-collection"
 *
 * const logger: EventSourcedLogger = {
 *   debug: (message, data) => console.debug(message, data),
 *   info: (message, data) => console.info(message, data),
 *   warn: (message, data) => console.warn(message, data),
 *   error: (message, data) => console.error(message, data),
 * }
 * ```
 */
export type EventSourcedLogger = {
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
};

const noopLogger: EventSourcedLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

const LOG_PREFIX = "[event-sourced]";

/**
 * Builds the logger used internally when you pass `debug` to a DB factory.
 * `false` / omitted is a no-op logger; `true` logs to `console`; an object is
 * used as-is.
 *
 * @example
 * ```ts
 * import { createEventSourcedLogger } from "event-sourced-collection"
 * import { createBrowserEventSourcedDB } from "event-sourced-collection/browser"
 *
 * const debug = createEventSourcedLogger(import.meta.env.DEV)
 *
 * createBrowserEventSourcedDB({
 *   databaseName: "app.sqlite",
 *   debug,
 *   collections: { todos: { getKey: (todo: { id: string }) => todo.id } },
 *   modules: async () => {
 *     const { createCollection } = await import("@tanstack/db")
 *     const persistence = await import("@tanstack/browser-db-sqlite-persistence")
 *     return { createCollection, ...persistence }
 *   },
 * })
 * ```
 */
export function createEventSourcedLogger(debug?: boolean | EventSourcedLogger): EventSourcedLogger {
  if (debug === undefined || debug === false) {
    return noopLogger;
  }

  if (typeof debug === "object") {
    return debug;
  }

  return {
    debug: (message, data) => {
      if (data === undefined) {
        console.debug(LOG_PREFIX, message);
        return;
      }
      console.debug(LOG_PREFIX, message, data);
    },
    info: (message, data) => {
      if (data === undefined) {
        console.info(LOG_PREFIX, message);
        return;
      }
      console.info(LOG_PREFIX, message, data);
    },
    warn: (message, data) => {
      if (data === undefined) {
        console.warn(LOG_PREFIX, message);
        return;
      }
      console.warn(LOG_PREFIX, message, data);
    },
    error: (message, data) => {
      if (data === undefined) {
        console.error(LOG_PREFIX, message);
        return;
      }
      console.error(LOG_PREFIX, message, data);
    },
  };
}
