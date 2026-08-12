import { getPaginatedFakeMoviesFn } from "@/fake-data/fake-moviees";
import { parseWhereWithHandlers } from "@/lib/tanstack/db/utils";
import { getQueryClient } from "@/lib/tanstack/query/queryclient";
import { BasicIndex, createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";

export const PAGINATED_MOVIES_COLLECTION_QUERY_KEY = "query-driven-movies";

type MoviesWhereClause = {
  page?: { _eq: number };
  q?: { _ilike: string };
};

export const paginatedMoviesCollection = createCollection(
  queryCollectionOptions({
    queryKey: [PAGINATED_MOVIES_COLLECTION_QUERY_KEY],
    queryFn: async (ctx) => {
      // const { sorts } = parseLoadSubsetOptions(ctx.meta?.loadSubsetOptions);
      // const { asc, desc } = parseParameterizedSorts(sorts);
      const where = parseWhereWithHandlers<MoviesWhereClause>(ctx.meta?.loadSubsetOptions?.where);
      const page = where?.page?._eq ?? 1;
      const q = where?.q?._ilike || undefined;
      const response = await getPaginatedFakeMoviesFn({
        data: { page, perPage: 10, q, includeTotal: true },
      });
      return response;
    },
    select: (data) => data.items,
    queryClient: getQueryClient(),
    getKey: (item) => item.id,
    autoIndex: "eager",
    defaultIndexType: BasicIndex,
    syncMode: "on-demand",
  }),
);
