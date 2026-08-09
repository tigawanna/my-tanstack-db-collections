import type {
  InboxRequiredRow,
  ManualSyncResult,
  MutationType,
  OutboxRequiredRow,
  PullEventsFn,
  PushEventsFn,
  RequiresInboxColumns,
  RequiresOutboxColumns,
  SyncHandlersConfig,
  SyncResult,
} from "./protocol";

/** Minimal table-like shape: Drizzle tables satisfy this via `$inferSelect` / `$inferInsert`. */
export type TableLike = {
  // `any` keeps InferSelect/InferInsert from being widened by a Record constraint.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $inferSelect: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $inferInsert: any;
};

export type InferSelect<TTable> = TTable extends { $inferSelect: infer S } ? S : never;

export type InferInsert<TTable> = TTable extends { $inferInsert: infer I } ? I : never;

export type CollectionDef<
  TTable extends TableLike = TableLike,
  TKey extends string | number = string,
> = {
  table: TTable;
  getKey: (row: InferSelect<TTable>) => TKey;
};

export type CollectionMap = Record<string, CollectionDef>;

export type SyncHooks<
  TOutbox extends OutboxRequiredRow = OutboxRequiredRow,
  TInbox extends InboxRequiredRow = InboxRequiredRow,
> = {
  /**
   * Transform an outbox row before insert (e.g. set deviceId / priority extras).
   * Return value must still satisfy the full outbox row type.
   */
  onAppendOutbox?: (row: TOutbox) => TOutbox | Promise<TOutbox>;
  /**
   * Transform an inbox row before insert (e.g. set receivedAt).
   */
  onPullInbox?: (row: TInbox) => TInbox | Promise<TInbox>;
  /**
   * Called before applying a pulled event to a domain table.
   * Return `false` to skip apply (row stays pending unless you mark it yourself).
   */
  beforeApply?: (args: {
    collectionId: string;
    type: MutationType;
    key: string;
    payload: Record<string, unknown>;
    inboxRow: TInbox;
  }) => boolean | Promise<boolean>;
  afterApply?: (args: {
    collectionId: string;
    type: MutationType;
    key: string;
    payload: Record<string, unknown>;
    inboxRow: TInbox;
  }) => void | Promise<void>;
  beforePush?: (
    events: ReadonlyArray<TOutbox>,
  ) => ReadonlyArray<TOutbox> | Promise<ReadonlyArray<TOutbox>>;
  afterPush?: (result: SyncResult) => void | Promise<void>;
};

export type DrizzleSyncEngineConfig<
  TDb,
  TOutboxTable extends TableLike,
  TInboxTable extends TableLike,
  TCollections extends CollectionMap,
> = {
  db: TDb;
  tables: {
    outbox: RequiresOutboxColumns<InferSelect<TOutboxTable>> extends InferSelect<TOutboxTable>
      ? TOutboxTable
      : never;
    inbox: RequiresInboxColumns<InferSelect<TInboxTable>> extends InferSelect<TInboxTable>
      ? TInboxTable
      : never;
  };
  collections: TCollections;
  sync?: SyncHandlersConfig;
  syncEnabled?: boolean;
  hooks?: SyncHooks<
    InferSelect<TOutboxTable> & OutboxRequiredRow,
    InferSelect<TInboxTable> & InboxRequiredRow
  >;
};

export type MutateApi<TCollections extends CollectionMap> = {
  insert: <TId extends keyof TCollections & string>(
    collectionId: TId,
    row: InferInsert<TCollections[TId]["table"]>,
  ) => Promise<void>;
  update: <TId extends keyof TCollections & string>(
    collectionId: TId,
    key: ReturnType<TCollections[TId]["getKey"]>,
    patch: Partial<InferInsert<TCollections[TId]["table"]>>,
  ) => Promise<void>;
  delete: <TId extends keyof TCollections & string>(
    collectionId: TId,
    key: ReturnType<TCollections[TId]["getKey"]>,
  ) => Promise<void>;
};

export type DrizzleSyncEngine<
  TDb,
  TOutboxTable extends TableLike,
  TInboxTable extends TableLike,
  TCollections extends CollectionMap,
> = {
  db: TDb;
  tables: {
    outbox: TOutboxTable;
    inbox: TInboxTable;
  };
  collections: TCollections;
  mutate: MutateApi<TCollections>;
  sync: () => Promise<SyncResult>;
  manualSync: () => Promise<ManualSyncResult>;
  getSyncEnabled: () => boolean;
  setSyncEnabled: (enabled: boolean) => void;
};

export type { PushEventsFn, PullEventsFn };
