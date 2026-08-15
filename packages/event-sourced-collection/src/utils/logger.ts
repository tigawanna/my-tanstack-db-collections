export type EventSourcedLogLevel = "debug" | "info" | "warn" | "error";

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
