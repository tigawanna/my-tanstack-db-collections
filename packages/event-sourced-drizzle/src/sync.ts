import type { MutationType } from "./internal/types";

// --- Wire protocol types (compatible with event-sourced-collection) ---

export type OutboundEvent = {
  eventId: string;
  collectionId: string;
  type: MutationType;
  key: string | number;
  payload: Record<string, unknown>;
  previous: Record<string, unknown> | null;
  txId: string;
  clientId: string;
  schemaVersion: number;
  baseVersion: string | null;
  timestamp: number;
};

export type ServerEvent = {
  globalSeq: number;
  eventId: string;
  collectionId: string;
  type: MutationType;
  key: string | number;
  payload: Record<string, unknown>;
  previous?: Record<string, unknown> | null;
  clientId?: string;
  schemaVersion?: number;
  timestamp: number;
  cursor: string;
  backendId?: string;
};

export type PushConfirmation = {
  eventId: string;
  globalSeq: number;
};

export type PushFailure = {
  eventId: string;
  message: string;
  code?: string;
  retryable?: boolean;
};

export type PushResponse = {
  confirmed: ReadonlyArray<PushConfirmation>;
  failed?: ReadonlyArray<PushFailure>;
};

export type PullResponse = {
  events: ReadonlyArray<ServerEvent>;
  cursor: string;
  hasMore: boolean;
  backendId?: string;
};

export type PushEventsFn = (
  events: ReadonlyArray<OutboundEvent>,
) => Promise<PushResponse | ReadonlyArray<PushConfirmation>>;

export type PullEventsFn = (params: { since: number }) => Promise<PullResponse>;

export type SyncTransport = {
  push: PushEventsFn;
  pull: (since: number) => Promise<PullResponse>;
};

export type SyncUrlConfig = {
  push: string;
  pull: string;
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
};

export type SyncHandlersConfig = {
  pushEvents?: PushEventsFn;
  pullEvents?: PullEventsFn;
  pushUrl?: string;
  pullUrl?: string;
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
};

export type NormalizedSyncTransport = {
  push?: PushEventsFn;
  pull?: (since: number) => Promise<PullResponse>;
};

// --- Transport normalization ---

type HeaderConfig = SyncHandlersConfig["headers"];

async function resolveHeaders(headers: HeaderConfig): Promise<Record<string, string>> {
  if (!headers) return {};
  if (typeof headers === "function") return headers();
  return headers;
}

function appendSince(url: string, since: number): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}since=${encodeURIComponent(String(since))}`;
}

function createHttpPush(url: string, headers: HeaderConfig): PushEventsFn {
  return async (events) => {
    if (events.length === 0) return { confirmed: [] };
    const resolvedHeaders = await resolveHeaders(headers);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...resolvedHeaders },
      body: JSON.stringify(events),
    });
    if (!response.ok) throw new SyncPushError(response.status, await response.text());
    return response.json() as Promise<PushResponse>;
  };
}

function createHttpPull(
  url: string,
  headers: HeaderConfig,
): (since: number) => Promise<PullResponse> {
  return async (since) => {
    const resolvedHeaders = await resolveHeaders(headers);
    const pullUrl = appendSince(url, since);
    const response = await fetch(pullUrl, {
      headers: { Accept: "application/json", ...resolvedHeaders },
    });
    if (!response.ok) throw new SyncPullError(response.status, await response.text());
    return response.json() as Promise<PullResponse>;
  };
}

function isTransport(
  value: SyncHandlersConfig | SyncUrlConfig | SyncTransport,
): value is SyncTransport {
  return (
    "push" in value &&
    typeof value.push === "function" &&
    "pull" in value &&
    typeof value.pull === "function"
  );
}

export function createSyncTransport(
  config?: SyncHandlersConfig | SyncUrlConfig | SyncTransport,
): NormalizedSyncTransport | null {
  if (!config) return null;

  if (isTransport(config)) {
    return { push: config.push, pull: config.pull };
  }

  const pushUrl =
    "pushUrl" in config
      ? config.pushUrl
      : "push" in config && typeof config.push === "string"
        ? config.push
        : undefined;
  const pullUrl =
    "pullUrl" in config
      ? config.pullUrl
      : "pull" in config && typeof config.pull === "string"
        ? config.pull
        : undefined;

  const push =
    "pushEvents" in config && config.pushEvents
      ? config.pushEvents
      : pushUrl
        ? createHttpPush(pushUrl, config.headers)
        : undefined;

  const pullEvents = "pullEvents" in config ? config.pullEvents : undefined;
  const pull = pullEvents
    ? (since: number) => pullEvents({ since })
    : pullUrl
      ? createHttpPull(pullUrl, config.headers)
      : undefined;

  if (!push && !pull) return null;
  return { push, pull };
}

export class SyncPushError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Event push failed: HTTP ${status}`);
    this.name = "SyncPushError";
  }
}

export class SyncPullError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Event pull failed: HTTP ${status}`);
    this.name = "SyncPullError";
  }
}
