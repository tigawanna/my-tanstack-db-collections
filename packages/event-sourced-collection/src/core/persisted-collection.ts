import type { Collection, CollectionConfig, UtilsRecord } from "@tanstack/db";
import type {
  PersistedCollectionUtils,
  persistedCollectionOptions,
} from "@tanstack/db-sqlite-persistence-core";

/**
 * TanStack `persistedCollectionOptions` injected into {@link createEventSourcedDB}
 * so the core does not import a persistence package itself.
 *
 * @example
 * ```ts
 * import { persistedCollectionOptions } from "@tanstack/node-db-sqlite-persistence"
 * import type { PersistedCollectionOptionsFn } from "event-sourced-collection"
 *
 * const options: PersistedCollectionOptionsFn = persistedCollectionOptions
 * ```
 */
export type PersistedCollectionOptionsFn = typeof persistedCollectionOptions;

/**
 * TanStack `createCollection` injected into {@link createEventSourcedDB}.
 *
 * @example Pass the real factory from `@tanstack/db`
 * ```ts
 * import { createCollection } from "@tanstack/db"
 * import type { CreateCollectionFn } from "event-sourced-collection"
 *
 * const factory: CreateCollectionFn = createCollection
 * ```
 */
export type CreateCollectionFn = <T extends object, TKey extends string | number>(
  options: CollectionConfig<T, TKey, never, UtilsRecord & PersistedCollectionUtils>,
) => Collection<T, TKey>;

/**
 * Loosely typed module function so version-skewed TanStack packages stay assignable
 * when passed as `modules` to a platform helper.
 */
export type InjectedModuleFn = (...args: never[]) => unknown;

/** Loosely typed `createCollection` for platform `modules` objects. */
export type InjectedCreateCollection = InjectedModuleFn;
