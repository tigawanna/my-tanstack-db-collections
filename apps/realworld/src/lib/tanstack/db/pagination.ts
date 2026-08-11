/**
 * Pagination helpers for TanStack DB live queries.
 *
 * Offset/limit pairs with `.orderBy()` (required by TanStack DB for
 * incremental maintenance). Cursor helpers are for opaque URL cursors when
 * paging server APIs or building custom peek-ahead windows.
 *
 * For infinite “load more” UIs, prefer `useLiveInfiniteQuery` from
 * `@tanstack/react-db` — it manages `limit` / `offset` via `setWindow`.
 *
 * @example Offset page with `useLiveQuery`
 * ```ts
 * const { page, perPage, offset } = normalizePaginationParams(search);
 *
 * const { data } = useLiveQuery(
 *   (q) =>
 *     q
 *       .from({ todo: db.collections.todos })
 *       .orderBy(({ todo }) => todo.updatedAt, "desc")
 *       .limit(perPage)
 *       .offset(offset),
 *   [page, perPage],
 * );
 *
 * // If you also have a total count (separate live count query or known size):
 * return buildPaginatedResponse({
 *   items: data ?? [],
 *   page,
 *   perPage,
 *   totalItems,
 * });
 * ```
 */

/** Metadata describing a page of offset/limit list results. */
export type PaginationMeta = {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
};

/** Standard offset/limit paginated list payload. */
export type PaginatedResponse<T> = {
  items: T[];
  pagination: PaginationMeta;
};

/** Optional page/size inputs for offset list endpoints. */
export type ListPaginationParams = {
  page?: number;
  perPage?: number;
};

/** Normalized page, size, and offset for a list query. */
export type NormalizedPagination = {
  page: number;
  perPage: number;
  offset: number;
};

/** Metadata describing a cursor-paginated page. */
export type CursorPaginationMeta = {
  limit: number;
  /** Opaque cursor for the next page (`after` / forward). `null` when exhausted. */
  nextCursor: string | null;
  /** Opaque cursor for the previous page (`before` / backward). `null` on the first page. */
  prevCursor: string | null;
  /** True when another forward page exists. */
  hasMore: boolean;
  /** True when a previous page exists (a request cursor was provided). */
  hasPrevious: boolean;
};

/** Standard cursor-paginated list payload. */
export type CursorPaginatedResponse<T> = {
  items: T[];
  pagination: CursorPaginationMeta;
};

/** Optional cursor/limit inputs for cursor list endpoints. */
export type ListCursorPaginationParams = {
  /** Opaque cursor from a previous response (`nextCursor` or `prevCursor`). */
  cursor?: string | null;
  limit?: number;
  /** Forward pages after `cursor`; backward pages before `cursor`. */
  direction?: "forward" | "backward";
};

/** Normalized cursor pagination inputs. */
export type NormalizedCursorPagination = {
  cursor: string | null;
  limit: number;
  direction: "forward" | "backward";
};

/** Sort direction accepted by TanStack DB `.orderBy()`. */
export type SortOrder = "asc" | "desc";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 100;
const DEFAULT_MAX_PER_PAGE = 500;
const DEFAULT_CURSOR_LIMIT = 50;
const DEFAULT_MAX_CURSOR_LIMIT = 200;

/**
 * Converts a 1-based page number into an `offset` for `.offset()`.
 *
 * @param page - 1-based page index.
 * @param perPage - Page size.
 */
export function calculateOffset(page: number, perPage: number) {
  return (Math.max(1, page) - 1) * Math.max(1, perPage);
}

/**
 * Clamps and fills list pagination inputs with defaults.
 *
 * @param params - Optional page / perPage from the caller (URL search, etc.).
 * @param defaults - Override defaults and max page size.
 */
export function normalizePaginationParams(
  params: ListPaginationParams = {},
  defaults: {
    page?: number;
    perPage?: number;
    maxPerPage?: number;
  } = {},
): NormalizedPagination {
  const maxPerPage = defaults.maxPerPage ?? DEFAULT_MAX_PER_PAGE;
  const page = Math.max(1, Math.trunc(params.page ?? defaults.page ?? DEFAULT_PAGE));
  const rawPerPage = Math.trunc(params.perPage ?? defaults.perPage ?? DEFAULT_PER_PAGE);
  const perPage = Math.min(maxPerPage, Math.max(1, rawPerPage));

  return {
    page,
    perPage,
    offset: calculateOffset(page, perPage),
  };
}

/**
 * Builds a standard `{ items, pagination }` list response.
 *
 * @param args.items - Rows for the current page.
 * @param args.page - 1-based page index.
 * @param args.perPage - Page size.
 * @param args.totalItems - Total matching rows across all pages.
 */
export function buildPaginatedResponse<T>({
  items,
  page,
  perPage,
  totalItems,
}: {
  items: T[];
  page: number;
  perPage: number;
  totalItems: number;
}): PaginatedResponse<T> {
  const safePage = Math.max(1, page);
  const safePerPage = Math.max(1, perPage);
  const safeTotal = Math.max(0, totalItems);

  return {
    items,
    pagination: {
      page: safePage,
      perPage: safePerPage,
      totalItems: safeTotal,
      totalPages: Math.ceil(safeTotal / safePerPage),
      hasMore: safePage * safePerPage < safeTotal,
    },
  };
}

/**
 * Builds offset pagination meta from a `limit + 1` peek fetch when you do not
 * know the global total (common with live queries).
 *
 * Fetch `perPage + 1` rows, pass them here, and use `pagination.hasMore` for
 * next-page controls. `totalItems` / `totalPages` are approximate for the
 * pages seen so far (`page * perPage` when more exist, else exact for this window).
 *
 * @example
 * ```ts
 * const { page, perPage, offset } = normalizePaginationParams(search);
 * const { data } = useLiveQuery(
 *   (q) =>
 *     q
 *       .from({ event: db.collections.outbox })
 *       .orderBy(({ event }) => event.localSeq, "desc")
 *       .limit(perPage + 1)
 *       .offset(offset),
 *   [page, perPage],
 * );
 *
 * return buildPaginatedResponseFromPeek({
 *   items: data ?? [],
 *   page,
 *   perPage,
 * });
 * ```
 */
export function buildPaginatedResponseFromPeek<T>({
  items,
  page,
  perPage,
}: {
  items: T[];
  page: number;
  perPage: number;
}): PaginatedResponse<T> {
  const safePage = Math.max(1, page);
  const safePerPage = Math.max(1, perPage);
  const hasMore = items.length > safePerPage;
  const pageItems = hasMore ? items.slice(0, safePerPage) : items;
  const totalItems = hasMore
    ? safePage * safePerPage + 1
    : (safePage - 1) * safePerPage + pageItems.length;

  return buildPaginatedResponse({
    items: pageItems,
    page: safePage,
    perPage: safePerPage,
    totalItems,
  });
}

/**
 * Resolves a sort key and direction for TanStack DB `.orderBy()`.
 *
 * @param args.sortBy - Caller-requested sort key (must exist in `allowedKeys`).
 * @param args.sortOrder - `"asc"` or anything else treated as descending.
 * @param args.allowedKeys - Allowed sort keys (e.g. from `createSortableColumns`).
 * @param args.defaultSortBy - Key used when `sortBy` is missing or unknown.
 * @param args.defaultSortOrder - Direction when `sortOrder` is omitted.
 */
export function resolveSortOrder<TKey extends string>({
  sortBy,
  sortOrder,
  allowedKeys,
  defaultSortBy,
  defaultSortOrder = "desc",
}: {
  sortBy?: string;
  sortOrder?: string;
  allowedKeys?: readonly TKey[];
  defaultSortBy: TKey;
  defaultSortOrder?: SortOrder;
}): { sortBy: TKey; sortOrder: SortOrder } {
  const allowed = allowedKeys ?? ([defaultSortBy] as readonly TKey[]);
  const key =
    sortBy && (allowed as readonly string[]).includes(sortBy) ? (sortBy as TKey) : defaultSortBy;
  const resolvedOrder: SortOrder =
    sortOrder === "asc" || sortOrder === "desc" ? sortOrder : defaultSortOrder;

  return { sortBy: key, sortOrder: resolvedOrder };
}

/**
 * Clamps and fills cursor pagination inputs with defaults.
 *
 * @param params - Optional cursor / limit / direction from the caller.
 * @param defaults - Override defaults and max page size.
 */
export function normalizeCursorPaginationParams(
  params: ListCursorPaginationParams = {},
  defaults: {
    limit?: number;
    maxLimit?: number;
    direction?: "forward" | "backward";
  } = {},
): NormalizedCursorPagination {
  const maxLimit = defaults.maxLimit ?? DEFAULT_MAX_CURSOR_LIMIT;
  const rawLimit = Math.trunc(params.limit ?? defaults.limit ?? DEFAULT_CURSOR_LIMIT);
  const limit = Math.min(maxLimit, Math.max(1, rawLimit));
  const cursor =
    typeof params.cursor === "string" && params.cursor.trim().length > 0
      ? params.cursor.trim()
      : null;
  const direction = params.direction ?? defaults.direction ?? "forward";

  return { cursor, limit, direction };
}

/**
 * Encodes bytes as URL-safe base64 without padding.
 */
function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

/**
 * Decodes a URL-safe base64 string into bytes.
 */
function fromBase64Url(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + "=".repeat(padLength));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encodes an opaque cursor payload as URL-safe base64 JSON.
 *
 * @param payload - Serializable cursor fields (e.g. `{ id, createdAt }`).
 */
export function encodeCursor<T extends Record<string, unknown>>(payload: T): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

/**
 * Decodes an opaque cursor produced by {@link encodeCursor}.
 *
 * @param cursor - Opaque cursor string from a client.
 * @returns Parsed payload, or `null` when the cursor is invalid.
 */
export function decodeCursor<T extends Record<string, unknown>>(cursor: string): T | null {
  try {
    const json = new TextDecoder().decode(fromBase64Url(cursor));
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * Builds a standard `{ items, pagination }` cursor page from a `LIMIT limit + 1` fetch.
 *
 * Query one extra row to detect whether another page exists, then pass the full
 * result here. For backward pages: reverse the order, fetch `limit + 1`,
 * reverse the rows back to display order, then call this helper.
 *
 * @param args.items - Rows from a `limit + 1` query, in display order.
 * @param args.limit - Requested page size (not including the peek row).
 * @param args.getCursor - Builds an opaque cursor for a boundary item.
 * @param args.cursor - Cursor used to request this page (`null` on the first page).
 * @param args.direction - Whether this page was fetched forward or backward.
 *
 * @example
 * ```ts
 * const { cursor, limit } = normalizeCursorPaginationParams(input);
 * const decoded = cursor ? decodeCursor<{ localSeq: number }>(cursor) : null;
 *
 * const { data } = useLiveQuery(
 *   (q) => {
 *     let query = q
 *       .from({ event: db.collections.outbox })
 *       .orderBy(({ event }) => event.localSeq, "desc");
 *     if (decoded?.localSeq != null) {
 *       query = query.where(({ event }) => lt(event.localSeq, decoded.localSeq));
 *     }
 *     return query.limit(limit + 1);
 *   },
 *   [cursor, limit],
 * );
 *
 * return buildCursorPaginatedResponse({
 *   items: data ?? [],
 *   limit,
 *   cursor,
 *   getCursor: (row) => encodeCursor({ localSeq: row.localSeq }),
 * });
 * ```
 */
export function buildCursorPaginatedResponse<T>({
  items,
  limit,
  getCursor,
  cursor = null,
  direction = "forward",
}: {
  items: T[];
  limit: number;
  getCursor: (item: T) => string;
  cursor?: string | null;
  direction?: "forward" | "backward";
}): CursorPaginatedResponse<T> {
  const safeLimit = Math.max(1, limit);
  const hasExtra = items.length > safeLimit;
  const pageItems = hasExtra ? items.slice(0, safeLimit) : items;
  const first = pageItems[0];
  const last = pageItems[pageItems.length - 1];
  const hasRequestCursor = cursor != null && cursor.length > 0;

  const hasMore = direction === "forward" ? hasExtra : hasRequestCursor;
  const hasPrevious = direction === "forward" ? hasRequestCursor : hasExtra;

  return {
    items: pageItems,
    pagination: {
      limit: safeLimit,
      nextCursor: last && hasMore ? getCursor(last) : null,
      prevCursor: first && hasPrevious ? getCursor(first) : null,
      hasMore,
      hasPrevious,
    },
  };
}
