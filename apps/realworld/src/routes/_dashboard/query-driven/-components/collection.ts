import { getPaginatedFakeMoviesFn } from "@/fake-data/fake-moviees";
import { getQueryClient } from "@/lib/tanstack/query/queryclient";
import { BasicIndex, createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";

export const PAGINATED_MOVIES_COLLECTION_QUERY_KEY = "query-driven-movies";

export const paginatedMoviesCollection = createCollection(
  queryCollectionOptions({
    queryKey: [PAGINATED_MOVIES_COLLECTION_QUERY_KEY],
    queryFn: async (ctx) => {
      const response = await getPaginatedFakeMoviesFn({
        data: { page: 1, perPage: 10, includeTotal: true },
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
