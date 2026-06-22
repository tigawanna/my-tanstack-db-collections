import { type IR, ParsedOrderBy, parseWhereExpression } from "@tanstack/db";

type SortDirection = { asc?: string[]; desc?: string[] };

/**
 * Groups TanStack DB order-by expressions into ascending and descending field lists.
 *
 * Use inside a query collection `queryFn` after extracting sorts with
 * `parseLoadSubsetOptions(ctx.meta?.loadSubsetOptions)`. Each sort field path is
 * joined with `_` so nested paths like `["user", "name"]` become `"user_name"`.
 *
 * @param sorts - Parsed order-by clauses from `parseLoadSubsetOptions`
 * @returns An object with `asc` and/or `desc` arrays of field name strings
 *
 * @example
 * ```ts
 * const { sorts } = parseLoadSubsetOptions(ctx.meta?.loadSubsetOptions);
 * const { asc, desc } = parseParameterizedSorts(sorts);
 *
 * await api.get({
 *   sortBy: asc?.length ? asc[0] : desc?.length ? desc[0] : undefined,
 *   sortOrder: asc?.length ? "asc" : desc?.length ? "desc" : "desc",
 * });
 * ```
 */
export function parseParameterizedSorts(sorts: ParsedOrderBy[]) {
  const objectifiedSorts = sorts.reduce((acc: SortDirection, sort) => {
    if (!acc[sort.direction])
      return {
        [sort.direction]: sort.field,
      };
    acc[sort.direction]?.push(...(sort.field as string[]));
    return acc;
  }, {});
  return objectifiedSorts;
}

/**
 * GraphQL-style where clause shape produced by {@link parseWhereWithHandlers}.
 *
 * Equality filters use `{ _eq: value }` on a field key. Field keys are built by
 * joining TanStack DB ref paths with `_` (e.g. `organizationId`, `page`).
 */
export type WhereClause = {
  [key: string]: any;
  _and?: WhereClause[];
  _or?: WhereClause[];
};

/**
 * Converts a TanStack DB where expression into a typed, API-friendly where object.
 *
 * Intended for query collections that receive `loadSubsetOptions` from on-demand
 * sync. Pass `ctx.meta?.loadSubsetOptions?.where` and type the result with a
 * domain-specific clause (e.g. `{ page?: { _eq: number } }`).
 *
 * - `eq` → `{ [fieldPath]: { _eq: value } }` (paths joined with `_`)
 * - `and` / `or` → conditions merged flat at the top level
 *
 * @param whereExpression - Where clause from `ctx.meta?.loadSubsetOptions`
 * @returns Parsed where object, or `undefined` when no filter is applied
 *
 * @example
 * ```ts
 * type UsersWhereClause = {
 *   page?: { _eq: number };
 *   _and?: UsersWhereClause[];
 * };
 *
 * const where = parseWhereWithHandlers<UsersWhereClause>(
 *   ctx.meta?.loadSubsetOptions?.where,
 * );
 *
 * const page = (where?.page?._eq as number) || 1;
 * ```
 */
export function parseWhereWithHandlers<T extends WhereClause>(
  whereExpression?: IR.BasicExpression<boolean>,
) {
  const where = parseWhereExpression<T>(whereExpression, {
    handlers: {
      // @ts-expect-error it's all good man
      eq: (field, value) => ({ [field.join("_")]: { _eq: value } }),
      and: (...conditions) => {
        // Hoist nested conditions to top level by merging them
        return conditions.reduce((acc, condition) => {
          return { ...acc, ...condition };
        }, {});
      },
      or: (...conditions) => {
        // Hoist nested conditions to top level by merging them
        return conditions.reduce((acc, condition) => {
          return { ...acc, ...condition };
        }, {});
      },
    },
  });
  return where;
}
