import type { Collection, IndexConstructor } from "@tanstack/db";
import type {
  PersistedCollectionPersistence,
  SQLiteDriver,
} from "@tanstack/db-sqlite-persistence-core";
import type { CreateCollectionFn, PersistedCollectionOptionsFn } from "./persisted-collection";
import type { EventSourcedLogger } from "./utils/logger";

export type { EventSourcedLogger } from "./utils/logger";

export type { SQLiteDriver, PersistedCollectionPersistence };
export type { CreateCollectionFn, PersistedCollectionOptionsFn } from "./persisted-collection";

export type MutationType = "insert" | "update" | "delete";
export type OutboxSyncStatus = "pending" | "synced" | "failed";

/**
 * What to do when a pulled event targets a collection this client does not know
 * about (older client, newer server). "skip" keeps the pipeline moving; "fail"
 * halts the pull so the event is retried on the next sync.
 */
export type UnknownEventHandling = "skip" | "fail";

/**
 * What to do when the server reports a different backend identity than the one
 * this client last synced with — typically a wiped or swapped database.
 *
 * - `resetCursor` (default) clears the inbox, re-pulls from zero, and requeues
 *   every retained outbox event so local history is re-uploaded to the new
 *   backend. Replay and push are both idempotent by `eventId`, so this is the
 *   least destructive way to recover. Note that events already removed by
 *   {@link PruneOptions | pruning} cannot be re-uploaded.
 * - `fail` surfaces an error and leaves the cursor alone.
 * - `ignore` carries on with the old cursor, which will usually mean the client
 *   silently never pulls again.
 */
export type BackendMismatchPolicy = "resetCursor" | "fail" | "ignore";

/**
 * Which direction a dead-lettered event was travelling. Outbound events came
 * from this device and can be re-pushed; inbound events came from the server
 * and can only be re-applied locally.
 */
export type DeadLetterDirection = "outbound" | "inbound";

/** Why an event was parked in the dead-letter queue. */
export type DeadLetterReason =
  | "rejected"
  | "maxAttemptsExceeded"
  | "conflict"
  | "manual"
  /** An inbound event whose replay kept throwing. */
  | "replayFailed";

export type OutboxEntry = {
  eventId: string;
  collectionId: string;
  type: MutationType;
  key: string | number;
  payload: Record<string, unknown>;
  /** State before the mutation. Present for update/delete, null for insert. */
  previous: Record<string, unknown> | null;
  /** Groups every event produced by a single collection transaction. */
  txId: string;
  clientId: string;
  /** Version of the payload shape, for upcasting on replay. */
  schemaVersion: number;
  /**
   * Row version this mutation was authored against, used for server-side
   * conflict detection. Null when conflict detection is disabled or the row was
   * previously unknown.
   */
  baseVersion: string | null;
  timestamp: number;
  localSeq: number;
  globalSeq: number | null;
  sync: boolean;
  syncStatus: OutboxSyncStatus;
  attemptCount: number;
  lastAttemptAt: number | null;
  /** Earliest time this event may be retried. Set by the backoff schedule. */
  nextAttemptAt: number | null;
  lastError: string | null;
  lastErrorCode: string | null;
  retryable: boolean | null;
};

export type InboxEntry = {
  eventId: string;
  globalSeq: number;
  collectionId: string;
  type: MutationType;
  key: string | number;
  payload: Record<string, unknown>;
  previous: Record<string, unknown> | null;
  clientId: string | null;
  schemaVersion: number;
  timestamp: number;
  sync: boolean;
  /** True when the event was durably recorded but intentionally not applied. */
  skipped: boolean;
  skipReason: string | null;
  /** Failed replay attempts so far. Rows written before this field read as 0. */
  attemptCount?: number;
  lastError?: string | null;
};

/**
 * An event that cannot make progress: an outgoing event the server refused or
 * that exhausted its retry budget, or an incoming event whose replay kept
 * throwing. Parked here instead of blocking the queue it came from forever.
 */
export type DeadLetterEntry = {
  eventId: string;
  collectionId: string;
  type: MutationType;
  key: string | number;
  payload: Record<string, unknown>;
  previous: Record<string, unknown> | null;
  /** Null for inbound events, which are not part of a local transaction. */
  txId: string | null;
  clientId: string | null;
  schemaVersion: number;
  /**
   * Row version this outbound mutation was authored against. Persisted so
   * `retryDeadLetter` can push the same conflict check upstream. Null for
   * inbound events and for rows written before this field existed.
   */
  baseVersion?: string | null;
  timestamp: number;
  /** Local ordering. Null for inbound events. */
  localSeq: number | null;
  /** Server ordering. Null for outbound events the server never accepted. */
  globalSeq: number | null;
  /** Rows written before this field existed read as "outbound". */
  direction?: DeadLetterDirection;
  reason: DeadLetterReason;
  message: string;
  code: string | null;
  attemptCount: number;
  failedAt: number;
};

/**
 * Single-row collection holding sync state that must outlive pruning: the pull
 * cursor, the identity of the backend it belongs to, and this device's own
 * identity.
 */
export type SyncMetaEntry = {
  id: string;
  backendId: string | null;
  /**
   * This device's stable identity. Persisted because it is what tells a pulled
   * event apart from this client's own echo once the outbox has been pruned.
   * Rows written before this field existed read as null and are backfilled.
   */
  clientId?: string | null;
  pullCursor: number;
  lastSyncAt: number | null;
  lastError: string | null;
};

/** Last known version of a row, used to author `baseVersion` on new mutations. */
export type RowVersionEntry = {
  id: string;
  collectionId: string;
  key: string | number;
  version: string;
  globalSeq: number | null;
};

export type ServerEvent = {
  globalSeq: number;
  eventId: string;
  collectionId: string;
  type: MutationType;
  key: string | number;
  payload: Record<string, unknown>;
  previous?: Record<string, unknown> | null;
  txId?: string;
  clientId?: string | null;
  schemaVersion?: number;
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
  /**
   * Stable identity of the backing event store. When this changes, the client's
   * cursor no longer refers to anything meaningful — see
   * {@link BackendMismatchPolicy}.
   */
  backendId?: string;
};

export type PushEventsFn = (
  events: ReadonlyArray<OutboundEvent>,
) => Promise<PushResponse | ReadonlyArray<PushConfirmation>>;

export type PullEventsFn = (params: { since: number }) => Promise<PullResponse>;

/** Lowest-level sync backend: push outbound events and pull since a cursor. */
export type SyncTransport = {
  push: PushEventsFn;
  /** Pull events strictly after `since` (the client's last known `globalSeq`). */
  pull: (since: number) => Promise<PullResponse>;
};

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
  /**
   * The row version this mutation was authored against. When present, the server
   * should reject the event (code `CONFLICT`) if the row has since moved on.
   */
  baseVersion: string | null;
  timestamp: number;
};

/**
 * HTTP sync via URL strings. The library POSTs outbound events to `push` and
 * GETs `pull?since=N` (appending `since` if missing). Prefer this when your
 * API is a plain REST pair; use {@link SyncHandlersConfig} for custom clients.
 */
export type SyncUrlConfig = {
  /** Absolute or relative URL that accepts a JSON array of {@link OutboundEvent}. */
  push: string;
  /** Absolute or relative URL that returns a {@link PullResponse} for `?since=N`. */
  pull: string;
  /** Static headers or a thunk that resolves them per request (e.g. auth tokens). */
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
};

/**
 * Mix-and-match sync wiring: supply handler functions, URL strings, or both.
 * Function handlers win over URLs when both are set for the same direction.
 */
export type SyncHandlersConfig = {
  /** Custom push implementation. Takes precedence over `pushUrl`. */
  pushEvents?: PushEventsFn;
  /** Custom pull implementation. Takes precedence over `pullUrl`. */
  pullEvents?: PullEventsFn;
  /** HTTP push endpoint when `pushEvents` is omitted. */
  pushUrl?: string;
  /** HTTP pull endpoint when `pullEvents` is omitted. */
  pullUrl?: string;
  /** Static headers or a thunk that resolves them per HTTP request. */
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
};

export type CollectionIndexDef<TState = object, TKey extends string | number = string> = {
  /** Projection used as the index key (e.g. `(row) => row.userId`). */
  select: (row: TState) => unknown;
  /** Optional stable name for debugging / index lookup. */
  name?: string;
  /** TanStack DB index constructor; defaults to the library default index type. */
  indexType?: IndexConstructor<TKey>;
};

export type CollectionDef<TState = object, TKey extends string | number = string> = {
  /** Stable primary key for each row. Used on the wire as the event `key`. */
  getKey: (state: TState) => TKey;
  /**
   * Persisted-collection schema version for this collection. Overrides the
   * database-level {@link EventSourcedDBConfig.schemaVersion} default.
   */
  schemaVersion?: number;
  /** Secondary indexes created when the collection is opened. */
  indexes?: ReadonlyArray<CollectionIndexDef<TState, TKey>>;
};

export type InferState<T> = T extends { getKey: (state: infer S) => string | number }
  ? [S] extends [never]
    ? object
    : S extends object
      ? S
      : object
  : object;

export type InferKey<T> = T extends { getKey: (state: never) => infer K }
  ? K extends string | number
    ? K
    : string
  : string;

type CollectionDefConstraint = {
  getKey: (state: never) => string | number;
  schemaVersion?: number;
  indexes?: ReadonlyArray<{
    select: (row: never) => unknown;
    name?: string;
    indexType?: IndexConstructor<string | number>;
  }>;
};

export type CollectionMap<TDefs extends Record<string, CollectionDefConstraint>> = {
  [K in keyof TDefs]: Collection<InferState<TDefs[K]>, InferKey<TDefs[K]>>;
};

export type ReservedCollections = {
  outbox: Collection<OutboxEntry, string>;
  inbox: Collection<InboxEntry, string>;
  deadletter: Collection<DeadLetterEntry, string>;
  syncmeta: Collection<SyncMetaEntry, string>;
  rowversions: Collection<RowVersionEntry, string>;
};

/**
 * Cross-context mutual exclusion, used to keep exactly one tab/worker syncing.
 * Injected rather than imported so the core stays platform-agnostic — the
 * browser platform helper supplies a Web Locks implementation.
 */
export type SyncLock = {
  /**
   * Runs `fn` while holding the named exclusive lock. Must resolve to
   * `{ acquired: false }` without running `fn` when the lock is held elsewhere,
   * rather than queueing.
   */
  tryRun: <T>(
    name: string,
    fn: () => Promise<T>,
  ) => Promise<{ acquired: true; result: T } | { acquired: false }>;
};

export type RetryConfig = {
  /**
   * Attempts before an event is moved to `deadletter`. Defaults to 8.
   * Permanent (non-retryable) rejections skip the budget and dead-letter
   * immediately.
   */
  maxAttempts?: number;
  /**
   * First backoff delay after a retryable failure; doubles each attempt until
   * `maxDelayMs`. Defaults to 1000ms.
   */
  baseDelayMs?: number;
  /** Cap on a single backoff step. Defaults to 5 minutes. */
  maxDelayMs?: number;
};

/** The subset of an event an upcaster may rewrite. */
export type UpcastableEvent = {
  eventId: string;
  collectionId: string;
  type: MutationType;
  key: string | number;
  payload: Record<string, unknown>;
  previous: Record<string, unknown> | null;
  schemaVersion: number;
};

/**
 * Migrates an event authored under an older schema version into the current
 * shape. Return `null` to record the event as skipped instead of applying it.
 */
export type UpcastEventFn = (event: UpcastableEvent) => UpcastableEvent | null;

export type PruneOptions = {
  /** Only prune rows older than this, in milliseconds. Defaults to 0 (all). */
  olderThanMs?: number;
  /** Always retain at least this many of the most recent rows per collection. */
  keepLast?: number;
};

export type PruneResult = {
  outbox: number;
  inbox: number;
};

/** Which entry point started a sync. */
export type SyncTrigger = "sync" | "manualSync";

/** Which stage of a sync an error came from. */
export type SyncPhase = "push" | "pull" | "replay";

/**
 * Observation points around the event lifecycle. Every hook is optional and
 * fire-and-forget: a hook that throws is logged and swallowed so it can never
 * break a sync. Do not mutate the values you are handed.
 */
export type EventSourcedHooks = {
  /** Fired once after collections are preloaded and startup replay has run. */
  onReady?: (context: { clientId: string; pullCursor: number }) => void;
  /** Fired for each local mutation appended to the outbox. */
  onMutation?: (entry: OutboxEntry) => void;
  onSyncStart?: (context: { trigger: SyncTrigger }) => void;
  onSyncComplete?: (context: { trigger: SyncTrigger; result: SyncResult }) => void;
  onSyncError?: (context: { phase: SyncPhase; error: Error }) => void;
  /** Fired when the server confirms an outbound event and assigns its order. */
  onEventPushed?: (context: { eventId: string; globalSeq: number }) => void;
  /** Fired when a remote event is replayed into a collection. */
  onEventApplied?: (context: {
    eventId: string;
    collectionId: string;
    type: MutationType;
    key: string | number;
  }) => void;
  /** Fired when an event is durably recorded but deliberately not applied. */
  onEventSkipped?: (context: { eventId: string; collectionId: string; reason: string }) => void;
  onDeadLetter?: (entry: DeadLetterEntry) => void;
  onBackendMismatch?: (context: {
    expected: string | null;
    received: string;
    policy: BackendMismatchPolicy;
  }) => void;
};

export type SyncStatus = {
  /** True while a sync is in flight. */
  isSyncing: boolean;
  /** True when nothing is waiting to be pushed. */
  isSynced: boolean;
  pendingCount: number;
  failedCount: number;
  deadLetterCount: number;
  pullCursor: number;
  backendId: string | null;
  lastSyncAt: number | null;
  lastError: string | null;
};

/**
 * Sync and lifecycle options shared by every event-sourced DB factory.
 * Declared as an interface (not a `Pick`) so property JSDoc shows in IntelliSense
 * on `createBrowserEventSourcedDB` / `createReactNativeEventSourcedDB` configs.
 *
 * Deep usage guide: `docs/usage.md` in this package.
 */
export interface EventSourcedSharedOptions {
  /**
   * How to reach the sync server: a URL pair ({@link SyncUrlConfig}), mixed
   * handlers/URLs ({@link SyncHandlersConfig}), or a raw {@link SyncTransport}.
   * Omit for a local-only database (mutations still land in the outbox).
   */
  sync?: SyncHandlersConfig | SyncUrlConfig | SyncTransport;
  /**
   * Whether sync may run. Defaults to `true`. This is only the **initial**
   * default — toggle later with `db.setSyncEnabled()` (e.g. from a Settings
   * row) without recreating the database.
   */
  syncEnabled?: boolean;
  /**
   * Default persisted-collection schema version applied to every collection that
   * does not set its own {@link CollectionDef.schemaVersion}. Defaults to 1.
   * Distinct from `eventSchemaVersion`, which stamps events on the wire.
   */
  schemaVersion?: number;
  /**
   * `true` enables the built-in console logger; pass an {@link EventSourcedLogger}
   * to route logs elsewhere. Defaults to off.
   */
  debug?: boolean | EventSourcedLogger;
  /**
   * Stable identifier for this device. Stamped on every outgoing event so the
   * server and other devices can attribute it, and used to recognise this
   * client's own events when they are pulled back.
   *
   * Defaults to a generated id that is persisted in `syncmeta` on first run and
   * reused on every subsequent one. Pass your own only if you have an identity
   * that is already stable across reloads; an unstable value makes this client
   * treat its own history as remote.
   */
  clientId?: string;
  /**
   * What to do when a pulled event targets an unknown collection.
   * Defaults to `"skip"`. See {@link UnknownEventHandling}.
   */
  unknownEventHandling?: UnknownEventHandling;
  /**
   * Rewinds the pull cursor by this many sequence numbers on every sync.
   * Guards against servers whose sequence generator can commit out of order
   * (e.g. Postgres `BIGSERIAL`), where a naive cursor can step over an event
   * that committed late. Replay is idempotent, so re-pulling is harmless.
   * Defaults to 0; prefer fixing sequence assignment server-side (e.g.
   * `BEGIN IMMEDIATE`). A small value like `5` is belt-and-suspenders.
   */
  pullOverlap?: number;
  /**
   * Version stamped on every newly authored outbox event. Defaults to 1.
   * Bump this when you change a collection's row shape, and provide
   * `upcastEvent` so older events can be migrated (or skipped) on replay.
   * Not the same as `schemaVersion` (that is for local SQLite persistence).
   */
  eventSchemaVersion?: number;
  /**
   * Migrates (or skips) events whose `schemaVersion` differs from the current
   * `eventSchemaVersion`. Return a rewritten event, or `null` to record
   * the event as skipped instead of applying it.
   */
  upcastEvent?: UpcastEventFn;
  /**
   * Retry / backoff for pushes the server marked `retryable: true`.
   * Exhausted attempts and non-retryable rejections (including `CONFLICT`) land
   * in the `deadletter` collection — surface them in UI or call
   * `retryDeadLetter()` (outbound events push directly upstream) /
   * `discardDeadLetter()`.
   */
  retry?: RetryConfig;
  /**
   * Maximum events per push request. Defaults to 100. Events that share a
   * `txId` stay in the same batch even if that exceeds the limit, so a single
   * transaction is never split across requests.
   */
  pushBatchSize?: number;
  /**
   * What to do when the server reports a different `backendId` than last sync
   * (wiped or swapped database). Defaults to `"resetCursor"`: clear the inbox,
   * pull from zero, and requeue retained outbox events. See
   * {@link BackendMismatchPolicy}.
   */
  backendMismatch?: BackendMismatchPolicy;
  /**
   * Tracks a per-row version index and stamps `baseVersion` on outgoing events
   * so the server can reject stale writes with `CONFLICT`. Off by default
   * because it writes the index on every mutation and every replay — turn on
   * when concurrent edits across devices matter.
   */
  conflictDetection?: boolean;
  /**
   * Fire-and-forget lifecycle callbacks (`onReady`, `onSyncComplete`,
   * `onDeadLetter`, …). Hook errors are logged and swallowed so they never
   * break sync. See {@link EventSourcedHooks}.
   */
  hooks?: EventSourcedHooks;
  /**
   * Elects a single syncing context across tabs/workers. See {@link SyncLock}.
   * Browser helper defaults this to Web Locks; pass `null` there to opt out.
   */
  lock?: SyncLock;
  /** Namespaces the sync lock. Defaults to the persistence database name. */
  lockName?: string;
}

/**
 * Shared options plus the user collection registry.
 * Platform helpers accept this shape (plus platform-specific fields).
 */
export type EventSourcedOptions<TDefs extends Record<string, CollectionDefConstraint>> =
  EventSourcedSharedOptions & {
    /**
     * User collection registry. Object keys become collection ids on the wire and
     * must not collide with reserved names (`outbox`, `inbox`, `deadletter`,
     * `syncmeta`, `rowversions`).
     */
    collections: TDefs;
  };

/**
 * Full configuration for `createEventSourcedDB`. Platform helpers such as
 * `createBrowserEventSourcedDB` / `createReactNativeEventSourcedDB` accept
 * {@link EventSourcedOptions} and supply persistence themselves.
 */
export type EventSourcedDBConfig<TDefs extends Record<string, CollectionDefConstraint>> =
  EventSourcedOptions<TDefs> & {
    /** Durable store that backs every collection (SQLite persistence or a test fake). */
    persistence: PersistedCollectionPersistence;
    /**
     * TanStack DB `createCollection` — injected so the core stays free of a hard
     * peer import (tree-shaking / bundler control).
     */
    createCollection: CreateCollectionFn;
    /**
     * `persistedCollectionOptions` from the persistence package — injected for the
     * same reason as `createCollection`.
     */
    persistedCollectionOptions: PersistedCollectionOptionsFn;
  };

export type EventSourcedDB<TDefs extends Record<string, CollectionDefConstraint>> = {
  collections: CollectionMap<TDefs> & ReservedCollections;
  sync: () => Promise<SyncResult>;
  manualSync: () => Promise<ManualSyncResult>;
  getSyncEnabled: () => boolean;
  setSyncEnabled: (enabled: boolean) => void;
  getSyncStatus: () => SyncStatus;
  subscribeSyncStatus: (listener: (status: SyncStatus) => void) => () => void;
  /**
   * Retries dead-lettered events.
   * Outbound events are pushed directly to the sync transport (not requeued).
   * Inbound events are requeued into the inbox and replayed. Omit `eventId` to
   * retry everything. Returns how many were cleared from the dead-letter queue.
   */
  retryDeadLetter: (eventId?: string) => Promise<number>;
  /** Permanently drops dead-lettered events. Returns how many were dropped. */
  discardDeadLetter: (eventId?: string) => Promise<number>;
  /**
   * Compacts the event log by deleting confirmed outbox rows and resolved inbox
   * rows. Safe because the pull cursor lives in `syncmeta`, not in the inbox.
   */
  pruneSyncedEvents: (options?: PruneOptions) => Promise<PruneResult>;
  dispose: () => void;
};

export type SyncResult = {
  pushed: number;
  pulled: number;
  /** Events durably recorded in the inbox but deliberately not applied. */
  skipped: number;
  /** Events moved to the dead-letter queue during this sync, in either direction. */
  deadLettered: number;
  /** True when another context held the sync lock, so this call did nothing. */
  deferred: boolean;
  errors: ReadonlyArray<Error>;
};

export type ManualSyncResult = SyncResult & {
  replayed: number;
};
