import { createCollection, eq, localOnlyCollectionOptions, queryOnce } from "@tanstack/db";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const fakeWatchlistSchema = z.object({
  id: z.string(),
  movieId: z.string(),
  createdAt: z.string(),
});

export type FakeWatchlistItem = z.infer<typeof fakeWatchlistSchema>;

// In-memory store for the fake watchlist API (same pattern as fake movies).
export const fakeWatchlistCollection = createCollection(
  localOnlyCollectionOptions({
    id: "fake-watchlist",
    getKey: (watchlist) => watchlist.id,
    schema: fakeWatchlistSchema,
  }),
);

export const getFakeWatchlistFn = createServerFn().handler(async () => {
  return await queryOnce((q) => q.from({ watchlist: fakeWatchlistCollection }));
});

export const addFakeWatchlistFn = createServerFn()
  .inputValidator(fakeWatchlistSchema)
  .handler(async ({ data }) => {
    const existing = await queryOnce((q) =>
      q
        .from({ watchlist: fakeWatchlistCollection })
        .where(({ watchlist }) => eq(watchlist.movieId, data.movieId)),
    );
    if (existing[0]) return existing[0];

    await fakeWatchlistCollection.insert(data).isPersisted.promise;
    return data;
  });

export const removeFakeWatchlistFn = createServerFn()
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await fakeWatchlistCollection.delete(data.id).isPersisted.promise;
    return { id: data.id };
  });
