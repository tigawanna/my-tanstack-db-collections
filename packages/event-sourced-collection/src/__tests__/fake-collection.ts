/**
 * In-memory stand-in for a TanStack DB persisted collection.
 *
 * Used by event-sourced-db tests so we can assert optimistic writes, rollback
 * on failed persistence hooks, multi-tab style shared storage, and sync
 * `acceptMutations` without a real SQLite driver.
 */
import type { CreateCollectionFn, PersistedCollectionOptionsFn } from "../persisted-collection";
import type { PersistedCollectionPersistence } from "../types";

type Row = Record<string, unknown>;

type Recipe<T> = (draft: T) => void;

/** Shape of `onInsert` / `onUpdate` / `onDelete` — where the real code appends outbox events. */
type MutationHook = (params: {
  transaction: {
    mutations: ReadonlyArray<{
      mutationId: string;
      key: string | number;
      modified: Row;
      original: Row;
    }>;
  };
}) => Promise<Row> | Row;

type CollectionOptions<T extends Row> = {
  id: string;
  getKey: (item: T) => string | number;
  persistence: FakePersistence;
  schemaVersion?: number;
  onInsert?: MutationHook;
  onUpdate?: MutationHook;
  onDelete?: MutationHook;
};

/** Mutation applied during sync replay (remote → local). */
type AcceptMutation = {
  type: "insert" | "update" | "delete";
  key: string | number;
  modified: Row;
};

/**
 * Stands in for a SQLite file. Rows live here rather than on the collection so
 * that two collections opened over the same persistence behave like two tabs
 * sharing a database: independent in-memory state, one durable store.
 */
export type FakePersistence = PersistedCollectionPersistence & {
  __store: Map<string, Map<string | number, Row>>;
};

export function createFakePersistence(): FakePersistence {
  const persistence = {
    __store: new Map<string, Map<string | number, Row>>(),
  };
  return persistence as unknown as FakePersistence;
}

/** Pre-populate the durable store before opening a collection (e.g. “already on disk”). */
export function seedCollection(
  persistence: FakePersistence,
  collectionId: string,
  key: string | number,
  row: Row,
): void {
  const backing = persistence.__store.get(collectionId) ?? new Map<string | number, Row>();
  backing.set(key, row);
  persistence.__store.set(collectionId, backing);
}

/** Mimics TanStack DB’s `{ isPersisted: { promise } }` return from insert/update/delete. */
function resolved(promise: Promise<unknown>): { isPersisted: { promise: Promise<void> } } {
  return { isPersisted: { promise: promise.then(() => undefined) } };
}

function rejected(error: unknown): { isPersisted: { promise: Promise<void> } } {
  const promise = Promise.reject(error);
  // The caller may only await `isPersisted`; keep the extra handle from
  // surfacing as an unhandled rejection.
  promise.catch(() => undefined);
  return { isPersisted: { promise } };
}

/**
 * Minimal collection: Map-backed rows, persistence hooks, and rollback on
 * hook failure — enough surface for createEventSourcedDb and sync tests.
 */
class FakeCollection<T extends Row> {
  readonly id: string;
  readonly indexes: Array<{ select: (row: Row) => unknown; name?: string }> = [];
  readonly utils: {
    acceptMutations: (tx: { mutations: ReadonlyArray<AcceptMutation> }) => Promise<void>;
  };

  private readonly getKey: (item: T) => string | number;
  /** Shared durable map — same reference as other instances with this collection id. */
  private readonly durable: Map<string | number, Row>;
  /** Optimistic view, mirroring the collection's in-memory state. */
  private readonly backing = new Map<string | number, T>();
  private readonly listeners = new Set<() => void>();
  private readonly onInsert?: MutationHook;
  private readonly onUpdate?: MutationHook;
  private readonly onDelete?: MutationHook;

  constructor(options: CollectionOptions<T>) {
    this.id = options.id;
    this.getKey = options.getKey;
    this.onInsert = options.onInsert;
    this.onUpdate = options.onUpdate;
    this.onDelete = options.onDelete;

    // Attach to (or create) the durable map for this collection id.
    // Do not hydrate `backing` here — real TanStack DB collections stay empty
    // until `preload()`, and createEventSourcedDB must call that before ready.
    const existing = options.persistence.__store.get(options.id);
    this.durable = existing ?? new Map<string | number, Row>();
    options.persistence.__store.set(options.id, this.durable);

    // Sync path: apply remote mutations straight to durable + optimistic state.
    this.utils = {
      acceptMutations: async (tx) => {
        for (const mutation of tx.mutations) {
          if (mutation.type === "delete") {
            this.write(mutation.key, undefined);
            continue;
          }
          this.write(mutation.key, mutation.modified as T);
        }
        this.notify();
      },
    };
  }

  get state(): Map<string | number, T> {
    return this.backing;
  }

  has(key: string | number): boolean {
    return this.backing.has(key);
  }

  get(key: string | number): T | undefined {
    return this.backing.get(key);
  }

  /** Re-reads the durable store, picking up writes made by another instance. */
  async preload(): Promise<void> {
    for (const [key, row] of this.durable) {
      if (!this.backing.has(key)) this.backing.set(key, { ...row } as T);
    }
  }

  subscribeChanges(callback: () => void): { unsubscribe: () => void } {
    this.listeners.add(callback);
    return { unsubscribe: () => this.listeners.delete(callback) };
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  /** Keep optimistic + durable maps in lockstep for local mutations. */
  private write(key: string | number, row: T | undefined): void {
    if (row === undefined) {
      this.backing.delete(key);
      this.durable.delete(key);
      return;
    }

    this.backing.set(key, row);
    this.durable.set(key, { ...row });
  }

  createIndex(
    select: (row: Row) => unknown,
    config?: { name?: string; indexType?: unknown },
  ): { name?: string } {
    this.indexes.push({ select, name: config?.name });
    return { name: config?.name };
  }

  /**
   * Applies the optimistic write, runs the persistence handler, and rolls the
   * write back if that handler rejects — the behaviour real TanStack DB
   * collections have, and the reason a failed outbox append must not leave an
   * orphaned row behind.
   */
  private async commit(
    key: string | number,
    next: T | undefined,
    previous: T | undefined,
    hook: MutationHook | undefined,
    mutation: { mutationId: string; key: string | number; modified: Row; original: Row },
  ): Promise<void> {
    this.write(key, next);
    this.notify();

    if (!hook) return;

    try {
      await hook({ transaction: { mutations: [mutation] } });
    } catch (error) {
      this.write(key, previous);
      this.notify();
      throw error;
    }
  }

  insert(item: T) {
    const key = this.getKey(item);

    if (this.backing.has(key)) {
      return rejected(new Error(`Duplicate key "${String(key)}" in collection "${this.id}"`));
    }

    return resolved(
      this.commit(key, item, undefined, this.onInsert, {
        mutationId: String(key),
        key,
        modified: item,
        original: {},
      }),
    );
  }

  update(key: string | number, recipe: Recipe<T>) {
    const current = this.backing.get(key);

    if (!current) {
      return rejected(new Error(`Cannot update missing key "${String(key)}" in "${this.id}"`));
    }

    const original = { ...current };
    const draft = { ...current };
    recipe(draft);

    return resolved(
      this.commit(key, draft, original, this.onUpdate, {
        mutationId: String(key),
        key,
        modified: draft,
        original,
      }),
    );
  }

  delete(key: string | number) {
    const current = this.backing.get(key);

    if (!current) {
      return rejected(new Error(`Cannot delete missing key "${String(key)}" in "${this.id}"`));
    }

    const original = { ...current };

    return resolved(
      this.commit(key, undefined, original, this.onDelete, {
        mutationId: String(key),
        key,
        modified: {},
        original,
      }),
    );
  }

  /**
   * Applies several mutations under one persistence handler call, the way a
   * real `createTransaction` batch does. Needed to exercise the rule that
   * events sharing a `txId` are never split across push batches.
   */
  insertMany(items: ReadonlyArray<T>) {
    const mutations = items.map((item) => {
      const key = this.getKey(item);
      return { mutationId: String(key), key, modified: item as Row, original: {} };
    });

    for (const item of items) this.write(this.getKey(item), item);
    this.notify();

    const hook = this.onInsert
      ? this.onInsert({ transaction: { mutations } })
      : Promise.resolve({});

    return resolved(Promise.resolve(hook));
  }
}

/** Pass-through so tests can plug this fake into `createPersistedCollection`-style wiring. */
export const fakePersistedCollectionOptions = ((options: unknown) =>
  options) as unknown as PersistedCollectionOptionsFn;

export const fakeCreateCollection = ((options: CollectionOptions<Row>) =>
  new FakeCollection(options)) as unknown as CreateCollectionFn;

/**
 * A factory whose replay path refuses certain rows, standing in for an event
 * the local schema cannot accept (a constraint violation, a missing relation).
 * Return a message to reject the mutation, or undefined to let it through.
 */
export function createRejectingCollectionFactory(
  reject: (key: string | number) => string | undefined,
): CreateCollectionFn {
  return ((options: CollectionOptions<Row>) => {
    const collection = new FakeCollection(options);
    const accept = collection.utils.acceptMutations;

    collection.utils.acceptMutations = async (tx) => {
      for (const mutation of tx.mutations) {
        const message = reject(mutation.key);
        if (message !== undefined) throw new Error(message);
      }
      return accept(tx);
    };

    return collection;
  }) as unknown as CreateCollectionFn;
}

export function getFakeCollectionIndexes(collection: {
  indexes?: Array<{ select: (row: Row) => unknown; name?: string }>;
}): Array<{ select: (row: Row) => unknown; name?: string }> {
  return collection.indexes ?? [];
}

/** Inserts several rows in one transaction, so they share a single `txId`. */
export function insertManyInTransaction<T extends Row>(
  collection: unknown,
  items: ReadonlyArray<T>,
): Promise<void> {
  return (collection as FakeCollection<T>).insertMany(items).isPersisted.promise;
}
