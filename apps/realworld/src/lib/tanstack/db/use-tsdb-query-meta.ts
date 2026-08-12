import { useQueryClient } from "@tanstack/react-query";

export type MetaObject<T> = {
  items: T[];
  page?: number | undefined;
  perPage?: number | undefined;
  totalItems?: number | undefined;
  totalPages?: number | undefined;
};

export type DBQueryMetaObject<T> = {
  queryKey: string[];
  meta: MetaObject<T>;
};

export function useTSDBQueryMeta(queryKey: string) {
  const qc = useQueryClient();
  const queriesData = qc.getQueriesData({ queryKey: [queryKey] });

  const metaObject = parseAndFindMetaObject(queriesData, queryKey);
  return metaObject;
}

export function parseAndFindMetaObject<T extends unknown[]>(
  queryData: [readonly unknown[], unknown][],
  queryKey: string,
) {
  const metaObject = queryData.find(([key, data]) => {
    return key.includes(queryKey) && data instanceof Object && "items" in data;
    // && "totalItems" in data
    // && "totalPages" in data
    // && "page" in data
    // && "perPage" in data
  });
  if (!metaObject)
    return {
      queryKey: undefined,
      meta: undefined,
    };
  return {
    queryKey: metaObject?.[0],
    meta: metaObject?.[1],
  } as DBQueryMetaObject<T>;
}
