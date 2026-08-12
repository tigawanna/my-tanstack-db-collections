import { getPaginatedFakeMoviesFn } from "@/fake-data/fake-moviees";
import { parseWhereWithHandlers } from "@/lib/tanstack/db/utils";
import { getQueryClient } from "@/lib/tanstack/query/queryclient";
import { BasicIndex, createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";

export const PAGINATED_MOVIES_COLLECTION_QUERY_KEY = "query-driven-movies";

type MoviesWhereClause = {
  page?: { _eq: number };
  q?: { _eq?: string; _ilike?: string };
};

function parseSearchQ(where: MoviesWhereClause | null | undefined) {
  const raw = where?.q?._eq ?? where?.q?._ilike;
  if (!raw) return undefined;
  const stripped = raw.replace(/^%|%$/g, "").trim();
  return stripped || undefined;
}

export const paginatedMoviesCollection = createCollection(
  queryCollectionOptions({
    queryKey: [PAGINATED_MOVIES_COLLECTION_QUERY_KEY],
    queryFn: async (ctx) => {
      const where = parseWhereWithHandlers<MoviesWhereClause>(ctx.meta?.loadSubsetOptions?.where);
      const page = where?.page?._eq ?? 1;
      const q = parseSearchQ(where);
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
    staleTime: 1000 * 60 * 60,
  }),
);
