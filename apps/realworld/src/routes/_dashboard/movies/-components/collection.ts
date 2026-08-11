import { getFakeMoviesFn } from "@/fake-data/fake-moviees";
import { getQueryClient } from "@/lib/tanstack/query/queryclient";
import { createCollection, parseLoadSubsetOptions } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";

export const moviesCollection = createCollection(
  queryCollectionOptions({
    queryKey: ["movies"],
    queryFn: async (ctx) => {
      ctx.client.setQueryData(["movies", "meta"], {
        page: 3,
        perPage: 40,
      });
      const params = parseLoadSubsetOptions(ctx.meta?.loadSubsetOptions);
      const qmeta = ctx.client.getQueryData(["movies", "meta"]);
      console.log({ params, qmeta });
      const response = await getFakeMoviesFn();
      return response;
    },
    queryClient: getQueryClient(),
    getKey: (item) => item.id,
    syncMode: "on-demand",
  }),
);
