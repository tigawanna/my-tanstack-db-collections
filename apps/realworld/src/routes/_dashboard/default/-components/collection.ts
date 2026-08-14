import { getFakeMoviesFn } from "@/fake-data/fake-moviees";
import { getQueryClient } from "@/lib/tanstack/query/queryclient";
import { BasicIndex, createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";

export const moviesCollection = createCollection(
  queryCollectionOptions({
    queryKey: ["movies"],
    queryFn: async () => {
      const response = await getFakeMoviesFn();
      return response;
    },
    queryClient: getQueryClient(),
    getKey: (item) => item.id,
    autoIndex: "eager",
    defaultIndexType: BasicIndex,
  }),
);
