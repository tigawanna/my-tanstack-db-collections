export { createEventSourcedDB } from "./core/create-event-sourced-db";
export { createEventSourcedDBHandle, resolveModules } from "./core/create-event-sourced-db-handle";
export type {
  EventSourcedDBHandle,
  EventSourcedDBHandleSetup,
  ModulesInput,
} from "./core/create-event-sourced-db-handle";
export { createLazySingleton } from "./core/lazy-singleton";
export type { LazySingleton, LazySingletonOptions } from "./core/lazy-singleton";
export { createHttpTransport, SyncPushError, SyncPullError } from "./core/sync";
export { BackendMismatchError } from "./internal/pull";
export { createMockSyncBackend } from "./testing/mock-sync-backend";
export type {
  MockRejectFn,
  MockRejection,
  MockSyncBackend,
  MockSyncBackendOptions,
} from "./testing/mock-sync-backend";
export { createWebLocksSyncLock, supportsWebLocks } from "./platforms/web-locks";
export { generateEventId } from "./utils/uuid";
export { createEventSourcedLogger } from "./utils/logger";

export type {
  BackendMismatchPolicy,
  CollectionDef,
  CollectionIndexConstructor,
  CollectionIndexDef,
  CollectionMap,
  DeadLetterDirection,
  DeadLetterEntry,
  DeadLetterReason,
  EventSourcedDB,
  EventSourcedDBConfig,
  EventSourcedOptions,
  EventSourcedSharedOptions,
  EventSourcedHooks,
  InboxEntry,
  EventSourcedLogger,
  InferKey,
  InferState,
  ManualSyncResult,
  MutationType,
  OutboundEvent,
  OutboxEntry,
  OutboxSyncStatus,
  PersistedCollectionPersistence,
  PruneOptions,
  PruneResult,
  PullEventsFn,
  PullResponse,
  PushConfirmation,
  PushEventsFn,
  PushFailure,
  PushResponse,
  ReservedCollections,
  RetryConfig,
  RowVersionEntry,
  ServerEvent,
  SyncHandlersConfig,
  SyncLock,
  SyncMetaEntry,
  SQLiteDriver,
  SyncPhase,
  SyncResult,
  SyncStatus,
  SyncTransport,
  SyncTrigger,
  SyncUrlConfig,
  UnknownEventHandling,
  UpcastableEvent,
  UpcastEventFn,
} from "./core/types";

export type {
  CreateCollectionFn,
  InjectedCreateCollection,
  InjectedModuleFn,
  PersistedCollectionOptionsFn,
} from "./core/persisted-collection";
