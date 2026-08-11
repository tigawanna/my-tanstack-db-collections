import { getPaginatedFakeMoviesFn } from "@/fake-data/fake-moviees";
import { getQueryClient } from "@/lib/tanstack/query/queryclient";
import { BasicIndex, createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";

export const paginatedMoviesCollection = createCollection(
  queryCollectionOptions({
    queryKey: ["movies"],
    queryFn: async () => {
      const response = await getPaginatedFakeMoviesFn({ data: { page: 1, perPage: 10 } });
      return response;
    },
    queryClient: getQueryClient(),
    getKey: (item) => item.id,
    autoIndex: "eager",
    defaultIndexType: BasicIndex,
    syncMode: "on-demand",
  }),
);
