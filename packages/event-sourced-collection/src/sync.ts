import type {
  OutboundEvent,
  PullEventsFn,
  PullResponse,
  PushConfirmation,
  PushEventsFn,
  PushResponse,
  SyncHandlersConfig,
  SyncTransport,
  SyncUrlConfig,
} from "./types";

export type NormalizedSyncTransport = {
  push?: PushEventsFn;
  pull?: (since: number) => Promise<PullResponse>;
};

type HeaderConfig = SyncHandlersConfig["headers"];

export function createHttpTransport(config: SyncUrlConfig): SyncTransport {
  return {
    push: createHttpPushEvents(config.push, config.headers),
    pull: createHttpPullEvents(config.pull, config.headers),
  };
}

export function createSyncTransport(
  config?: SyncHandlersConfig | SyncUrlConfig | SyncTransport,
): NormalizedSyncTransport | null {
  if (!config) {
    return null;
  }

  if (isTransport(config)) {
    return {
      push: config.push,
      pull: config.pull,
    };
  }

  const pushUrl = getPushUrl(config);
  const pullUrl = getPullUrl(config);

  const push =
    "pushEvents" in config && config.pushEvents
      ? config.pushEvents
      : pushUrl
        ? createHttpPushEvents(pushUrl, config.headers)
        : undefined;

  const pullEvents = "pullEvents" in config ? config.pullEvents : undefined;
  const pull = pullEvents
    ? createPullFromHandler(pullEvents)
    : pullUrl
      ? createHttpPullEvents(pullUrl, config.headers)
      : undefined;

  if (!push && !pull) {
    return null;
  }

  return { push, pull };
}

export function normalizePushResponse(
  response: PushResponse | ReadonlyArray<PushConfirmation>,
): PushResponse {
  if (isConfirmationArray(response)) {
    return { confirmed: response };
  }

  return {
    confirmed: response.confirmed,
    failed: response.failed,
  };
}

function isConfirmationArray(
  response: PushResponse | ReadonlyArray<PushConfirmation>,
): response is ReadonlyArray<PushConfirmation> {
  return Array.isArray(response);
}

function createHttpPushEvents(url: string, headers: HeaderConfig): PushEventsFn {
  return async (events: ReadonlyArray<OutboundEvent>): Promise<PushResponse> => {
    if (events.length === 0) return { confirmed: [] };

    const resolvedHeaders = await resolveHeaders(headers);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...resolvedHeaders },
      body: JSON.stringify(events),
    });

    if (!response.ok) {
      throw new SyncPushError(response.status, await response.text());
    }

    return response.json() as Promise<PushResponse>;
  };
}

function createPullFromHandler(pullEvents: PullEventsFn): (since: number) => Promise<PullResponse> {
  return (since: number) => pullEvents({ since });
}

function createHttpPullEvents(
  url: string,
  headers: HeaderConfig,
): (since: number) => Promise<PullResponse> {
  return async (since: number): Promise<PullResponse> => {
    const resolvedHeaders = await resolveHeaders(headers);
    const pullUrl = appendSince(url, since);

    const response = await fetch(pullUrl, {
      headers: { Accept: "application/json", ...resolvedHeaders },
    });

    if (!response.ok) {
      throw new SyncPullError(response.status, await response.text());
    }

    return response.json() as Promise<PullResponse>;
  };
}

async function resolveHeaders(headers: HeaderConfig): Promise<Record<string, string>> {
  if (!headers) return {};
  if (typeof headers === "function") return headers();
  return headers;
}

function appendSince(url: string, since: number): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}since=${encodeURIComponent(String(since))}`;
}

function getPushUrl(config: SyncHandlersConfig | SyncUrlConfig): string | undefined {
  if ("pushUrl" in config && config.pushUrl) {
    return config.pushUrl;
  }

  if ("push" in config && typeof config.push === "string") {
    return config.push;
  }

  return undefined;
}

function getPullUrl(config: SyncHandlersConfig | SyncUrlConfig): string | undefined {
  if ("pullUrl" in config && config.pullUrl) {
    return config.pullUrl;
  }

  if ("pull" in config && typeof config.pull === "string") {
    return config.pull;
  }

  return undefined;
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

export function isTransport(
  value: SyncHandlersConfig | SyncUrlConfig | SyncTransport,
): value is SyncTransport {
  return "push" in value && typeof value.push === "function";
}
