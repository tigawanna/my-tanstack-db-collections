import type { Collection, CollectionConfig, UtilsRecord } from "@tanstack/db";
import type {
  PersistedCollectionUtils,
  persistedCollectionOptions,
} from "@tanstack/db-sqlite-persistence-core";

export type PersistedCollectionOptionsFn = typeof persistedCollectionOptions;

export type CreateCollectionFn = <T extends object, TKey extends string | number>(
  options: CollectionConfig<T, TKey, never, UtilsRecord & PersistedCollectionUtils>,
) => Collection<T, TKey>;
