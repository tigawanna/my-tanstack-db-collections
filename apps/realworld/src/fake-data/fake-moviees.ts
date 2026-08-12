import {
  count,
  createCollection,
  ilike,
  localOnlyCollectionOptions,
  queryOnce,
} from "@tanstack/db";
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
    const q = search?.trim() ?? "";

    const stamp = <T extends object>(item: T) => ({ ...item, page, q });

    const itemsPromise = queryOnce((qb) => {
      let innerQ = qb
        .from({ movies: fakeMovieCollection })
        .orderBy(({ movies }) => movies.rating, "desc");
      if (q) {
        innerQ = innerQ.where(({ movies }) => ilike(movies.title, `%${q}%`));
      }
      return innerQ.limit(perPage).offset((page - 1) * perPage);
    });

    if (!includeTotal) {
      return { items: (await itemsPromise).map(stamp) };
    }

    const [items, totals] = await Promise.all([
      itemsPromise,
      queryOnce((qb) => {
        let countQ = qb.from({ movies: fakeMovieCollection });
        if (q) {
          countQ = countQ.where(({ movies }) => ilike(movies.title, `%${q}%`));
        }
        return countQ.select(({ movies }) => ({
          total: count(movies.id),
        }));
      }),
    ]);

    const totalItems = totals[0]?.total ?? 0;
    const totalPages = perPage > 0 ? Math.ceil(totalItems / perPage) : 0;

    return {
      page,
      perPage,
      items: items.map(stamp),
      totalItems,
      totalPages,
    };
  });
