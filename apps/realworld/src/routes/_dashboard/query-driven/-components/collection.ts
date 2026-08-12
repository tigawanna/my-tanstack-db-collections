import { getPaginatedFakeMoviesFn } from "@/fake-data/fake-moviees";
import { parseParameterizedSorts, parseWhereWithHandlers } from "@/lib/tanstack/db/utils";
import { getQueryClient } from "@/lib/tanstack/query/queryclient";
import { BasicIndex, createCollection, parseLoadSubsetOptions } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";

export const PAGINATED_MOVIES_COLLECTION_QUERY_KEY = "query-driven-movies";

// type UsersWhereClause = {
//   page?: { _eq: number };
//   _and?: UsersWhereClause[];
// };
export const paginatedMoviesCollection = createCollection(
  queryCollectionOptions({
    queryKey: [PAGINATED_MOVIES_COLLECTION_QUERY_KEY],
    queryFn: async (ctx) => {
      const { sorts } = parseLoadSubsetOptions(ctx.meta?.loadSubsetOptions);
      const { asc, desc } = parseParameterizedSorts(sorts);
      const where = parseWhereWithHandlers<{ page?: { _eq: number } }>(
        ctx.meta?.loadSubsetOptions?.where,
      );

      console.log("=== where ===  ", where);
      console.log("=== sorts ===  ", sorts);
      console.log("=== asc ===  ", asc);
      console.log("=== desc ===  ", desc);

      const page = where?.page?._eq ?? 1;
      const response = await getPaginatedFakeMoviesFn({
        data: { page, perPage: 10, includeTotal: true },
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
