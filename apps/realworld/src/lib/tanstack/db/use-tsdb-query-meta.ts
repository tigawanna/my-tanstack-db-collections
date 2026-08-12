import { useQueryClient } from "@tanstack/react-query";

export type MetaObject<T> = {
  items: T[];
  page?: number;
  perPage?: number;
  totalItems?: number;
  totalPages?: number;
};

export type DBQueryMetaObject<T> = {
  queryKey: string[];
  meta: MetaObject<T>;
};

export function useTSDBQueryMeta(queryKey: string) {
  const qc = useQueryClient();
  const queriesData = qc.getQueriesData({ queryKey: [queryKey] });

  console.log("=== queryKey,queriesData ===  ", queryKey, queriesData);
  const metaObject = parseAndFindMetaObject(queriesData, queryKey);
  console.log("metaObject ===  ", metaObject);
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
  return {
    queryKey: metaObject?.[0],
    meta: metaObject?.[1],
  } as DBQueryMetaObject<T> | undefined;
}
