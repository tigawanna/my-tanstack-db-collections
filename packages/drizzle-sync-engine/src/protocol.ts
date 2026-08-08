/** Wire protocol — compatible with event-sourced-collection server handlers. */

export type MutationType = "insert" | "update" | "delete";
export type OutboxSyncStatus = "pending" | "synced" | "failed";

export type OutboundEvent = {
  eventId: string;
  collectionId: string;
  type: MutationType;
  key: string | number;
  payload: Record<string, unknown>;
  timestamp: number;
};

export type ServerEvent = {
  globalSeq: number;
  eventId: string;
  collectionId: string;
  type: MutationType;
  key: string | number;
  payload: Record<string, unknown>;
  timestamp: number;
  cursor: string;
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
};

export type PushEventsFn = (
  events: ReadonlyArray<OutboundEvent>,
) => Promise<PushResponse | ReadonlyArray<PushConfirmation>>;

export type PullEventsFn = (params: { since: number }) => Promise<PullResponse>;

export type SyncHandlersConfig = {
  pushEvents?: PushEventsFn;
  pullEvents?: PullEventsFn;
};

export type SyncResult = {
  pushed: number;
  pulled: number;
  errors: ReadonlyArray<Error>;
};

export type ManualSyncResult = SyncResult & {
  replayed: number;
};

/** Required outbox column names (JS property keys on the Drizzle table). */
export const OUTBOX_REQUIRED_KEYS = [
  "eventId",
  "collectionId",
  "type",
  "key",
  "payload",
  "timestamp",
  "localSeq",
  "globalSeq",
  "sync",
  "syncStatus",
  "attemptCount",
  "lastAttemptAt",
  "lastError",
  "lastErrorCode",
  "retryable",
] as const;

/** Required inbox column names (JS property keys on the Drizzle table). */
export const INBOX_REQUIRED_KEYS = [
  "eventId",
  "globalSeq",
  "collectionId",
  "type",
  "key",
  "payload",
  "timestamp",
  "sync",
] as const;

export type OutboxRequiredKey = (typeof OUTBOX_REQUIRED_KEYS)[number];
export type InboxRequiredKey = (typeof INBOX_REQUIRED_KEYS)[number];

/** Base outbox row shape before user extensions. */
export type OutboxRequiredRow = {
  eventId: string;
  collectionId: string;
  type: MutationType;
  key: string;
  payload: Record<string, unknown>;
  timestamp: number;
  localSeq: number;
  globalSeq: number | null;
  sync: boolean;
  syncStatus: OutboxSyncStatus;
  attemptCount: number;
  lastAttemptAt: number | null;
  lastError: string | null;
  lastErrorCode: string | null;
  retryable: boolean | null;
};

/** Base inbox row shape before user extensions. */
export type InboxRequiredRow = {
  eventId: string;
  globalSeq: number;
  collectionId: string;
  type: MutationType;
  key: string;
  payload: Record<string, unknown>;
  timestamp: number;
  sync: boolean;
};

/**
 * Ensures `T` includes every required outbox column.
 * Extra columns are allowed; missing required keys fail at compile time.
 */
export type RequiresOutboxColumns<T> = OutboxRequiredKey extends keyof T
  ? T
  : {
      __error: "Outbox table is missing required columns";
      missing: Exclude<OutboxRequiredKey, keyof T>;
    };

/**
 * Ensures `T` includes every required inbox column.
 * Extra columns are allowed; missing required keys fail at compile time.
 */
export type RequiresInboxColumns<T> = InboxRequiredKey extends keyof T
  ? T
  : {
      __error: "Inbox table is missing required columns";
      missing: Exclude<InboxRequiredKey, keyof T>;
    };
