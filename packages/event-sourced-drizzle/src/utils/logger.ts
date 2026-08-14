export type LogLevel = "debug" | "info" | "warn" | "error";

export type EventSourcedLogger = {
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
};

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function createConsoleLogger(minLevel: LogLevel = "debug"): EventSourcedLogger {
  const min = LOG_LEVELS[minLevel];

  function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= min;
  }

  return {
    debug(message, data) {
      if (shouldLog("debug")) console.debug(`[event-sourced-drizzle] ${message}`, data ?? "");
    },
    info(message, data) {
      if (shouldLog("info")) console.info(`[event-sourced-drizzle] ${message}`, data ?? "");
    },
    warn(message, data) {
      if (shouldLog("warn")) console.warn(`[event-sourced-drizzle] ${message}`, data ?? "");
    },
    error(message, data) {
      if (shouldLog("error")) console.error(`[event-sourced-drizzle] ${message}`, data ?? "");
    },
  };
}

const NOOP_LOGGER: EventSourcedLogger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

export function createEventSourcedLogger(
  config?: boolean | EventSourcedLogger,
): EventSourcedLogger {
  if (!config) return NOOP_LOGGER;
  if (config === true) return createConsoleLogger();
  return config;
}
