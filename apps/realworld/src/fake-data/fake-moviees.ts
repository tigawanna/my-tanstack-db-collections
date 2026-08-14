import { createCollection, ilike, localOnlyCollectionOptions, queryOnce } from "@tanstack/db";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import pagedMovies from "../../public/fake-data/movies.json";

export const fakeMovieSchema = z.object({
  adult: z.boolean(),
  backdrop_path: z.string().nullable(),
  genre_ids: z.array(z.number()),
  id: z.number(),
  title: z.string(),
  original_language: z.string(),
  original_title: z.string(),
  overview: z.string(),
  popularity: z.number(),
  poster_path: z.string().nullable(),
  release_date: z.string(),
  softcore: z.boolean(),
  video: z.boolean(),
  vote_average: z.number(),
  vote_count: z.number(),
});

export type FakeMovie = z.infer<typeof fakeMovieSchema>;

const fakeMovieData = (pagedMovies as FakeMovie[][]).flat();

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

const MOVIE_SORT_KEYS = [
  "title",
  "overview",
  "vote_average",
  "release_date",
  "popularity",
] as const;
type MovieSortKey = (typeof MOVIE_SORT_KEYS)[number];

export const getPaginatedFakeMoviesFn = createServerFn()
  .inputValidator(
    z.object({
      page: z.number(),
      perPage: z.number(),
      q: z.string().optional(),
      sortBy: z.enum(MOVIE_SORT_KEYS).optional(),
      sortDirection: z.enum(["asc", "desc"]).optional(),
      /** When true, also returns total + totalPages over the filtered set. */
      includeTotal: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { page, perPage, q: search, includeTotal } = data;
    const q = search?.trim() ?? "";
    const sortBy: MovieSortKey = data.sortBy ?? "vote_average";
    const sortDirection = data.sortDirection ?? "desc";

    const stamp = <T extends object>(item: T) => ({ ...item, page, q });

    const itemsPromise = queryOnce((qb) => {
      const base = qb
        .from({ movies: fakeMovieCollection })
        .orderBy(({ movies }) => movies[sortBy], sortDirection);
      const filtered = q ? base.where(({ movies }) => ilike(movies.title, `%${q}%`)) : base;
      return filtered.limit(perPage).offset((page - 1) * perPage);
    });

    if (!includeTotal) {
      return { page, perPage, q, items: (await itemsPromise).map(stamp) };
    }

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
