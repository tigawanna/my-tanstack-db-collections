import { count, createCollection, eq, localOnlyCollectionOptions, queryOnce } from "@tanstack/db";
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
      /** When true, also returns total + totalPages over the full collection. */
      includeTotal: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { page, perPage, q: search, includeTotal } = data;

    const itemsPromise = queryOnce((qb) => {
      let innerQ = qb
        .from({ movies: fakeMovieCollection })
        .orderBy(({ movies }) => movies.rating, "desc");
      if (search) {
        innerQ = innerQ.where(({ movies }) => eq(movies.title, search));
      }
      return innerQ.limit(perPage).offset((page - 1) * perPage);
    });

    if (!includeTotal) {
      return { items: await itemsPromise };
    }

    // Count every item in the collection (not the search filter) so page
    // counts reflect the full dataset.
    const [items, totals] = await Promise.all([
      itemsPromise,
      queryOnce((qb) =>
        qb.from({ movies: fakeMovieCollection }).select(({ movies }) => ({
          total: count(movies.id),
        })),
      ),
    ]);

    const totalItems = totals[0]?.total ?? 0;
    const totalPages = perPage > 0 ? Math.ceil(totalItems / perPage) : 0;

    return {
      page,
      perPage,
      items,
      totalItems,
      totalPages: totalPages,
    };
  });
