import { createCollection, ilike, localOnlyCollectionOptions, queryOnce } from "@tanstack/db";
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
      /** When true, also returns total + totalPages over the filtered set. */
      includeTotal: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { page, perPage, q: search, includeTotal } = data;
    const q = search?.trim() ?? "";

    const stamp = <T extends object>(item: T) => ({ ...item, page, q });

    const itemsPromise = queryOnce((qb) => {
      const base = qb
        .from({ movies: fakeMovieCollection })
        .orderBy(({ movies }) => movies.rating, "desc");
      const filtered = q ? base.where(({ movies }) => ilike(movies.title, `%${q}%`)) : base;
      return filtered.limit(perPage).offset((page - 1) * perPage);
    });

    if (!includeTotal) {
      return { page, perPage, q, items: (await itemsPromise).map(stamp) };
    }

    // Count matching rows with the same filter as the page query so pagination
    // reflects the active search (not the full collection).
    const [items, matchingIds] = await Promise.all([
      itemsPromise,
      queryOnce((qb) => {
        const base = qb.from({ movies: fakeMovieCollection });
        const filtered = q ? base.where(({ movies }) => ilike(movies.title, `%${q}%`)) : base;
        return filtered.select(({ movies }) => ({ id: movies.id }));
      }),
    ]);

    const totalItems = matchingIds.length;
    const totalPages = perPage > 0 ? Math.ceil(totalItems / perPage) : 0;

    return {
      page,
      perPage,
      q,
      items: items.map(stamp),
      totalItems,
      totalPages,
    };
  });
