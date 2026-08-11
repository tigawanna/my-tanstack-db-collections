import { createCollection, eq, localOnlyCollectionOptions, queryOnce } from "@tanstack/db";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import fakeMovieData from "../../public/fake-movies.json";

// Define collection with persistence handlers
export const fakeMovieCollection = createCollection(
  localOnlyCollectionOptions({
    id: "fake-movies",
    getKey: (movie) => movie.id,
    initialData: fakeMovieData,
  }),
);

export const getFakeMoviesFn = createServerFn().handler(async () => {
  return await queryOnce((q) => q.from({ movies: fakeMovieCollection }));
});

export const getPaginatedFakeMoviesFn = createServerFn()
  .inputValidator(
    z.object({
      page: z.number(),
      perPage: z.number(),
      q: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { page, perPage, q } = data;
    return queryOnce((queryBuilder) => {
      let innerQ = queryBuilder
        .from({ movies: fakeMovieCollection })
        .orderBy(({ movies }) => movies.rating, "desc");
      if (q) {
        innerQ = innerQ.where(({ movies }) => eq(movies.title, q));
      }
      return innerQ.limit(perPage).offset((page - 1) * perPage);
    });
  });
