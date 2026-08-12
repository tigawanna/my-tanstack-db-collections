import { useQueryClient } from "@tanstack/react-query";

export type MetaObject<T = unknown> = {
  items: T[];
  page?: number | undefined;
  perPage?: number | undefined;
  q?: string | undefined;
  totalItems?: number | undefined;
  totalPages?: number | undefined;
};

export type DBQueryMetaObject<T> = {
  queryKey: readonly unknown[] | undefined;
  meta: MetaObject<T> | undefined;
};

export type TSDBQueryMetaMatch = {
  page?: number;
  q?: string;
};

export function useTSDBQueryMeta(queryKey: string, match?: TSDBQueryMetaMatch) {
  const qc = useQueryClient();
  const queriesData = qc.getQueriesData({ queryKey: [queryKey] });

  const metaObject = parseAndFindMetaObject(queriesData, queryKey, match);
  return metaObject;
}

export function parseAndFindMetaObject<T>(
  queryData: [readonly unknown[], unknown][],
  queryKey: string,
  match?: TSDBQueryMetaMatch,
) {
  const candidates = queryData.filter(([, data]) => isMetaObject(data));

  const keyed = candidates.filter(([key]) =>
    key.some((part) => typeof part === "string" && part.includes(queryKey)),
  );

  const pool = keyed.length > 0 ? keyed : candidates;

  const matched = match
    ? pool.find(([, data]) => metaMatches(data as MetaObject, match))
    : undefined;

  const metaObject = matched ?? pool.at(-1);

  if (!metaObject) {
    return {
      queryKey: undefined,
      meta: undefined,
    };
  }

  return {
    queryKey: metaObject[0],
    meta: metaObject[1] as MetaObject<T>,
  } satisfies DBQueryMetaObject<T>;
}

function isMetaObject(data: unknown): data is MetaObject {
  return (
    !!data &&
    typeof data === "object" &&
    "items" in data &&
    Array.isArray((data as MetaObject).items)
  );
}

function metaMatches(data: MetaObject, match: TSDBQueryMetaMatch) {
  if (match.page != null && data.page != null && data.page !== match.page) {
    return false;
  }

  const wantedQ = (match.q ?? "").trim();
  const cachedQ = (data.q ?? "").trim();
  if (wantedQ !== cachedQ) {
    return false;
  }

  return true;
}
