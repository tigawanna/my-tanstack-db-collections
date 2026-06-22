import { Collection } from "@tanstack/db";

/**
 * Extracts the schema type from a TanStack DB Collection.
 *
 * This is a utility type that uses TypeScript's conditional types to extract the schema
 * (database record structure) from a TanStack DB Collection. It works by pattern-matching
 * on the Collection's generic parameters.
 *
 * @example
 * ```tsx
 * // Given a collection like this:
 * const usersCollection = db.collection<User>(...)
 *
 * // CollectionSchema extracts the User type:
 * type UserSchema = CollectionSchema<typeof usersCollection>; // = User
 * ```
 */
export type CollectionSchema<T> = T extends Collection<infer S, any> ? S : never;

/**
 * Gets the keys (column names) from a collection's schema as a string union type.
 *
 * This extracts all the property names from the collection's schema and ensures they are strings.
 * This is what enables type-safe column selection - you can only reference columns that actually
 * exist in your database schema.
 *
 * @example
 * ```tsx
 * // Given a User schema with properties: id, name, email, createdAt
 * type UserColumns = CollectionColumns<typeof usersCollection>;
 * // = "id" | "name" | "email" | "createdAt"
 *
 * // TypeScript will error if you try to use a column that doesn't exist:
 * // { value: "invalidColumn", label: "Invalid" } // ✗ TypeScript Error
 * // { value: "name", label: "Name" } // ✓ Valid
 * ```
 */
export type CollectionColumns<T> = keyof CollectionSchema<T> & string;

/**
 * Configuration object that defines a single sortable column in your collection.
 *
 * This tells the sorting component what database columns can be sorted and how to label them
 * in the UI. The value must match an actual column name from your collection schema (enforced
 * by TypeScript), and the label is what users see in the UI.
 *
 * @template TColumn - The column name as a string literal type (automatically inferred)
 *
 * @example
 * ```tsx
 * // Example column configurations:
 * { value: "name", label: "Organization Name" }
 * { value: "createdAt", label: "Date Created" }
 * { value: "revenue", label: "Monthly Revenue" }
 * ```
 */
export interface ColumnConfig<TColumn extends string> {
  /** The database column key from the collection schema. Must be a valid column name. */
  value: TColumn;
  /** User-friendly label displayed in the sort UI dropdown. */
  label: string;
}

/**
 * Type-safe helper function to create sortable columns configuration.
 *
 * This function serves two purposes:
 * 1. Acts as a "type enforcer" - ensures all column names you specify actually exist in your collection
 * 2. Returns the same array so you can use it directly in your components
 *
 * TypeScript will give you an error if you try to specify a column that doesn't exist in your schema.
 * This prevents runtime errors from trying to sort on non-existent columns.
 *
 * @template TCollection - The TanStack DB Collection type
 * @template TColumns - The column names from the collection schema (auto-inferred)
 *
 * @param _collection - The TanStack DB collection (used only for type inference, not used at runtime)
 * @param columns - Array of column configurations to make sortable
 * @returns The same columns array, now with guaranteed type safety
 *
 * @example
 * ```tsx
 * import { organizationsCollection } from "@/data-access-layer/collections/organizations";
 * import { createSortableColumns } from "@/lib/tanstack/db/sortable-columns";
 *
 * // TypeScript ensures these column names actually exist in organizationsCollection
 * const sortableColumns = createSortableColumns(organizationsCollection, [
 *   { value: "name", label: "Organization Name" },
 *   { value: "createdAt", label: "Created Date" },
 *   { value: "slug", label: "URL Slug" },
 * ]);
 *
 * // Later, use this in your component:
 * <TanstackDBColumnFilters
 *   collection={organizationsCollection}
 *   sortableColumns={sortableColumns}
 *   search={search}
 *   navigate={navigate}
 * />
 * ```
 *
 * @example Invalid usage (TypeScript will error):
 * ```tsx
 * // ✗ "invalidColumn" doesn't exist in organizationsCollection
 * const sortableColumns = createSortableColumns(organizationsCollection, [
 *   { value: "invalidColumn", label: "Invalid" }, // TypeScript Error!
 * ]);
 * ```
 */
export function createSortableColumns<
  TCollection extends Collection<any, any>,
  TColumns extends CollectionColumns<TCollection>,
>(_collection: TCollection, columns: Array<ColumnConfig<TColumns>>): Array<ColumnConfig<TColumns>> {
  return columns;
}
