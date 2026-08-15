import type {
  MutationType,
  OutboundEvent,
  PullResponse,
  PushConfirmation,
  PushFailure,
  PushResponse,
  ServerEvent,
  SyncTransport,
} from "./types";

export type MockRejection = {
  message: string;
  code?: string;
  retryable?: boolean;
};

/**
 * Decides the fate of a pushed event. Return `undefined` to accept it.
 * Throwing from here simulates a transport-level failure for the whole batch.
 */
export type MockRejectFn = (event: OutboundEvent, attempt: number) => MockRejection | undefined;

export type MockSyncBackendOptions = {
  /** Identity reported on pull, for exercising backend-reset detection. */
  backendId?: string;
  /** Max events returned per pull page. Defaults to all of them. */
  pageSize?: number;
  /** Per-event push rejection hook. */
  rejectPush?: MockRejectFn;
};

export type MockSyncBackend = SyncTransport & {
  /** Everything the server has accepted, in assigned order. */
  readonly events: ReadonlyArray<ServerEvent>;
  readonly pushCalls: number;
  readonly pullCalls: number;
  /** Batch sizes seen by push, in order — useful for asserting batching. */
  readonly pushBatchSizes: ReadonlyArray<number>;
  /** Injects an event as though another device had pushed it. */
  seed: (event: {
    collectionId: string;
    type?: MutationType;
    key: string | number;
    payload: Record<string, unknown>;
    eventId?: string;
    clientId?: string;
  }) => ServerEvent;
  /** Fails the next `count` push calls at the transport level. */
  failNextPushes: (count: number, message?: string) => void;
  /** Changes reported identity, simulating a wiped or swapped backend. */
  setBackendId: (backendId: string) => void;
  /** Drops all stored events and restarts sequence numbering. */
  reset: () => void;
};

/**
 * In-memory sync backend for tests: assigns sequence numbers, deduplicates by
 * `eventId`, paginates, and can inject rejections and outages.
 */
export function createMockSyncBackend(options: MockSyncBackendOptions = {}): MockSyncBackend {
  const events: ServerEvent[] = [];
  const seen = new Map<string, number>();
  const attempts = new Map<string, number>();
  const pushBatchSizes: number[] = [];

  let backendId = options.backendId;
  let globalSeq = 0;
  let pushCalls = 0;
  let pullCalls = 0;
  let failPushes = 0;
  let failMessage = "mock transport failure";

  function append(event: Omit<ServerEvent, "globalSeq" | "cursor">): ServerEvent {
    const existing = seen.get(event.eventId);
    if (existing !== undefined) return events[existing]!;

    globalSeq += 1;
    const stored: ServerEvent = { ...event, globalSeq, cursor: String(globalSeq) };
    seen.set(event.eventId, events.length);
    events.push(stored);
    return stored;
  }

  const backend: MockSyncBackend = {
    get events() {
      return events;
    },
    get pushCalls() {
      return pushCalls;
    },
    get pullCalls() {
      return pullCalls;
    },
    get pushBatchSizes() {
      return pushBatchSizes;
    },

    push: async (batch: ReadonlyArray<OutboundEvent>): Promise<PushResponse> => {
      pushCalls += 1;
      pushBatchSizes.push(batch.length);

      if (failPushes > 0) {
        failPushes -= 1;
        throw new Error(failMessage);
      }

      const confirmed: PushConfirmation[] = [];
      const failed: PushFailure[] = [];

      for (const event of batch) {
        const attempt = (attempts.get(event.eventId) ?? 0) + 1;
        attempts.set(event.eventId, attempt);

        const rejection = options.rejectPush?.(event, attempt);

        if (rejection) {
          failed.push({
            eventId: event.eventId,
            message: rejection.message,
            code: rejection.code,
            retryable: rejection.retryable,
          });
          continue;
        }

        const stored = append({
          eventId: event.eventId,
          collectionId: event.collectionId,
          type: event.type,
          key: event.key,
          payload: event.payload,
          previous: event.previous,
          txId: event.txId,
          clientId: event.clientId,
          schemaVersion: event.schemaVersion,
          timestamp: event.timestamp,
        });

        confirmed.push({ eventId: stored.eventId, globalSeq: stored.globalSeq });
      }

      return { confirmed, failed };
    },

    pull: async (since: number): Promise<PullResponse> => {
      pullCalls += 1;

      const newer = events.filter((event) => event.globalSeq > since);
      const pageSize = options.pageSize ?? newer.length;
      const page = newer.slice(0, Math.max(1, pageSize));
      const cursor = page.length > 0 ? page[page.length - 1]!.cursor : String(since);

      return {
        events: page,
        cursor,
        hasMore: page.length < newer.length,
        ...(backendId === undefined ? {} : { backendId }),
      };
    },

    seed: (event) =>
      append({
        eventId: event.eventId ?? `mock-${events.length + 1}`,
        collectionId: event.collectionId,
        type: event.type ?? "insert",
        key: event.key,
        payload: event.payload,
        previous: null,
        clientId: event.clientId ?? "mock-remote-client",
        timestamp: 0,
      }),

    failNextPushes: (count, message) => {
      failPushes = count;
      if (message !== undefined) failMessage = message;
    },

    setBackendId: (next) => {
      backendId = next;
    },

    reset: () => {
      events.length = 0;
      seen.clear();
      attempts.clear();
      globalSeq = 0;
    },
  };

  return backend;
}
