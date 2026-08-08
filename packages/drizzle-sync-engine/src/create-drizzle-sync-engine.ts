import type { CollectionMap, DrizzleSyncEngine, DrizzleSyncEngineConfig, TableLike } from "./types";

const NOT_IMPLEMENTED =
  "drizzle-sync-engine: mutate/sync apply path is not implemented yet — schema + types are ready";

/**
 * Create a Drizzle-backed sync engine.
 *
 * Inbox/outbox schemas come from `defineOutboxTable` / `defineInboxTable`
 * (`drizzle-sync-engine/sqlite` or `/pg`). Domain writes go through `mutate`
 * so outbox append stays automatic once the apply path lands.
 *
 * Current milestone: typed API surface + schema builders. Runtime sync/mutate
 * throws until the SQL apply path is implemented.
 */
export function createDrizzleSyncEngine<
  TDb,
  TOutboxTable extends TableLike,
  TInboxTable extends TableLike,
  TCollections extends CollectionMap,
>(
  config: DrizzleSyncEngineConfig<TDb, TOutboxTable, TInboxTable, TCollections>,
): DrizzleSyncEngine<TDb, TOutboxTable, TInboxTable, TCollections> {
  let syncEnabled = config.syncEnabled ?? true;

  const notImplemented = async (): Promise<never> => {
    throw new Error(NOT_IMPLEMENTED);
  };

  return {
    db: config.db,
    tables: {
      outbox: config.tables.outbox as TOutboxTable,
      inbox: config.tables.inbox as TInboxTable,
    },
    collections: config.collections,
    mutate: {
      insert: notImplemented,
      update: notImplemented,
      delete: notImplemented,
    },
    sync: notImplemented,
    manualSync: notImplemented,
    getSyncEnabled: () => syncEnabled,
    setSyncEnabled: (enabled: boolean) => {
      syncEnabled = enabled;
    },
  };
}
