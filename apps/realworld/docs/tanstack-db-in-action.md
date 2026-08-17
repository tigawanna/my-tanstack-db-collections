# TanStack DB in Action

The team at TanStack, makers of TanStack Query (aka react-query), partnered with the [ElectricSQL](https://electric.ax/) team to give us something truly awesome.

This library excites me for two reasons:

## Why it excites me

### Joining data from multiple sources

Anything you can express as a collection can be joined to another collection with SQL-like semantics, and the library automatically handles mitigating against N+1 queries.

```ts
// Left join - all users, even without posts
const allUsers = createLiveQueryCollection((q) =>
  q
    .from({ user: usersCollection })
    .leftJoin({ post: postsCollection }, ({ user, post }) => eq(user.id, post.userId)),
);
```

### Basic local-first functionality

The library shipped persistence in its latest version, backed by SQLite with Web and React Native adapters, enabling true local-first approaches—all while remaining provider- and backend-agnostic.

In my usage of the library, I have discovered a few cool approaches that make life with this library better.

## The Basics

TanStack DB comes with adapters for many local-first providers, but in our case, we'll be using the TanStack Query adapter since it lets us progressively enhance.

### From `useQuery` to a collection

Let's take the example of a movie app:

```tsx
import { useQuery } from "@tanstack/react-query";

export function MovieListWithUseQuery() {
  // TODO: add filters from url search params
  const filters = {
    page: 1,
    perPage: 10,
    q: "",
    sortBy: "vote_average",
    sortDirection: "desc",
    includeTotal: true,
  } as const;
  const { data, isLoading } = useQuery({
    queryKey: ["movies-with-use-query"],
    queryFn: () =>
      getPaginatedFakeMoviesFn({
        data: filters,
      }),
  });

  return (
    <div className="w-full flex flex-col">
      <h1 className="text-2xl font-bold">Movies</h1>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {data?.items.map((movie) => (
            <div key={movie.id}>{movie.title}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

This is a nice starting point for us to port. We start by creating the collection definition:

```ts
export const moviesCollection = createCollection(
  queryCollectionOptions({
    queryKey: [PAGINATED_MOVIES_COLLECTION_QUERY_KEY],
    queryFn: async (ctx) => {
      const filters = {
        page: 1,
        perPage: 10,
        q: "",
        sortBy: "vote_average",
        sortDirection: "desc",
        includeTotal: true,
      } as const;
      const response = await getPaginatedFakeMoviesFn({
        data: filters,
      });
      return response;
    },
    select: (data) => data.items,
    queryClient: getQueryClient(),
    getKey: (item) => item.id,
    autoIndex: "eager",
    defaultIndexType: BasicIndex,
    staleTime: 1000 * 60 * 60,
  }),
);
```

### Querying with `useLiveQuery`

And we can query our collection via a `useLiveQuery` hook:

```tsx
import { useLiveQuery } from "@tanstack/react-db";
import { queryDrivenMoviesCollection } from "../query-driven-collection";

export function MovieList() {
  const { data, isLoading } = useLiveQuery((qb) =>
    qb.from({ movies: moviesCollection }).orderBy(({ movies }) => movies.vote_average, "desc"),
  );

  return (
    <div className="w-full flex flex-col">
      <h1 className="text-2xl font-bold">Movies</h1>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {data?.map((movie) => (
            <div key={movie.id}>{movie.title}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

For now, this might seem like a downgrade compared to the previous setup as it requires more boilerplate, and if you've noticed, we're not passing the filters to get a new paginated subset.

While TanStack DB can handle up to 50,000 rows with no problem, our backend team or third-party APIs would never allow us to fetch that many records at once. We'll explore solutions to that later, but for now, let's do something that `useQuery` can't.

```ts
//  watchlist collection
export const watchlistCollection = createCollection(
  queryCollectionOptions({
    queryKey: [WATCHLIST_COLLECTION_QUERY_KEY],
    queryFn: async () => getFakeWatchlistFn(),
    queryClient: getQueryClient(),
    schema: fakeWatchlistSchema,
    getKey: (item) => item.id,
    autoIndex: "eager",
    defaultIndexType: BasicIndex,
    staleTime: 1000 * 60 * 60,
    onInsert: async ({ transaction }) => {
      await Promise.all(
        transaction.mutations.map((mutation) =>
          addFakeWatchlistFn({
            data: {
              id: mutation.modified.id,
              movieId: mutation.modified.movieId,
              createdAt: mutation.modified.createdAt,
            } satisfies FakeWatchlistItem,
          }),
        ),
      );
    },
    onDelete: async ({ transaction }) => {
      await Promise.all(
        transaction.mutations.map((mutation) =>
          removeFakeWatchlistFn({ data: { id: String(mutation.key) } }),
        ),
      );
    },
  }),
);
```

### Joining with another collection

```tsx
import { eq, isUndefined, not, useLiveQuery } from "@tanstack/react-db";
import { moviesCollection, watchlistCollection } from "../query-driven-collection";

export function MovieList() {
  const { data, isLoading } = useLiveQuery((qb) =>
    qb
      .from({ movies: queryDrivenMoviesCollection })
      .join({ watchlist: watchlistCollection }, ({ movies, watchlist }) =>
        eq(movies.id, watchlist.movieId),
      )
      .orderBy(({ movies }) => movies.vote_average, "desc")
      .select(({ movies, watchlist }) => ({
        id: movies.id,
        title: movies.title,
        overview: movies.overview,
        poster_path: movies.poster_path,
        vote_average: movies.vote_average,
        release_date: movies.release_date,
        watchlistId: watchlist.id,
        onWatchlist: not(isUndefined(watchlist)),
      })),
  );

  return (
    <div className="w-full flex flex-col">
      <h1 className="text-2xl font-bold">Movies</h1>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {data?.map((movie) => (
            <div key={movie.id}>{movie.title}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

This is not impossible to accomplish in `useQuery` land, but it is not as incrementally computed and certainly not as clean. Comparisons can take a back seat for now as we examine how to do partial data responses and handle non-array responses.

### Handling non-array responses

As you might notice:

```ts
      const response = await getPaginatedFakeMoviesFn({
        data:filters
      });
      return response; // this response is an object and checking the query devtools will show the whole payload, but TanStack DB only allows you to return an array, so we use the select method below similar to the TanStack Query equivalent
    },
    select: (data) => data.items, // only return the items array from the collection
```

![The whole query payload is captured, but we can only return the items array from the collection](./image/devtools-query-no-sync.png)

### Reading pagination metadata from the query store

This means we can grab the rest of the metadata from the query store. I made a handy helper for this:

```ts
import { useQueryClient } from "@tanstack/react-query";

export type MetaObject<T = unknown> = {
  items: T[];
  page?: number | undefined;
  perPage?: number | undefined;
  q?: string | undefined;
  totalItems?: number | undefined;
  totalPages?: number | undefined;
};

export type DBQueryMetaObject<T> = {
  queryKey: readonly unknown[] | undefined;
  meta: MetaObject<T> | undefined;
};

export type TSDBQueryMetaMatch = {
  page?: number;
  q?: string;
};

export function useTSDBQueryMeta(queryKey: string, match?: TSDBQueryMetaMatch) {
  const qc = useQueryClient();
  const queriesData = qc.getQueriesData({ queryKey: [queryKey] });

  const metaObject = parseAndFindMetaObject(queriesData, queryKey, match);
  return metaObject;
}

export function parseAndFindMetaObject<T>(
  queryData: [readonly unknown[], unknown][],
  queryKey: string,
  match?: TSDBQueryMetaMatch,
) {
  const candidates = queryData.filter(([, data]) => isMetaObject(data));

  const keyed = candidates.filter(([key]) =>
    key.some((part) => typeof part === "string" && part.includes(queryKey)),
  );

  const pool = keyed.length > 0 ? keyed : candidates;

  const matched = match
    ? pool.find(([, data]) => metaMatches(data as MetaObject, match))
    : undefined;

  const metaObject = matched ?? pool.at(-1);

  if (!metaObject) {
    return {
      queryKey: undefined,
      meta: undefined,
    };
  }

  return {
    queryKey: metaObject[0],
    meta: metaObject[1] as MetaObject<T>,
  } satisfies DBQueryMetaObject<T>;
}

function isMetaObject(data: unknown): data is MetaObject {
  return (
    !!data &&
    typeof data === "object" &&
    "items" in data &&
    Array.isArray((data as MetaObject).items)
  );
}

function metaMatches(data: MetaObject, match: TSDBQueryMetaMatch) {
  if (match.page != null && data.page != null && data.page !== match.page) {
    return false;
  }

  const wantedQ = (match.q ?? "").trim();
  const cachedQ = (data.q ?? "").trim();
  if (wantedQ !== cachedQ) {
    return false;
  }

  return true;
}

// usage
const { meta } = useTSDBQueryMeta(PAGINATED_MOVIES_COLLECTION_QUERY_KEY, {
  page,
  q,
});
// meta.page
// meta.totalItems
// meta.totalPages...
```

## Pagination

### Client-side infinite query

If your server does return a massive payload, you can leverage the `useLiveInfiniteQuery` hook to perform cursor-based pagination on the dataset that has already been fetched:

```tsx
import { useLiveInfiniteQuery } from "@tanstack/react-db";
import { useState } from "react";
import ResponsivePagination from "react-responsive-pagination";

export function ListMoviesInfinite() {
  const { isLoading, fetchNextPage, pages, pageParams, hasNextPage, state } = useLiveInfiniteQuery(
    (q) =>
      q.from({ movies: moviesCollection }).orderBy(({ movies }) => movies.vote_average, "desc"),
    {
      initialPageParam: 0,
      pageSize: 200,
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length === 200 ? allPages.length : undefined,
    },
  );

  const latestPage = pageParams.at(-1);
  const [currentPage, setCurrentPage] = useState(latestPage ?? 0);
  const currentPageData = pages[currentPage];

  async function handleLoadMore() {
    setCurrentPage((prev) => (latestPage ?? prev) + 1);
    fetchNextPage();
  }

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div className="w-full h-full flex justify-end items-center gap-4">
        <div className="max-w-[90%] w-full ">
          <ResponsivePagination
            current={currentPage}
            total={latestPage ?? 1}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
        <Button onClick={handleLoadMore} disabled={!hasNextPage}>
          Load more
        </Button>
      </div>
      <div className="w-full h-full flex flex-col gap-4">
        <MoviesTable data={currentPageData} isLoading={isLoading} />
      </div>
    </div>
  );
}
```

### Query-driven sync

This works, but it doesn't give us ultimate control, which is unlocked via a feature released in `0.5` called [query-driven-sync](https://tanstack.com/blog/tanstack-db-0.5-query-driven-sync).

To achieve this, we set the collection sync option to `on-demand`:

> [!NOTE]
> This will opt us out of the ability to preload a collection in the loaders [more info](https://tanstack.com/intent/registry/%2540tanstack%252Fdb/meta-framework#on-demand-query-collection-preload)

```ts
import { parseWhereWithHandlers } from "@/lib/tanstack/db/utils";
import { BasicIndex, createCollection, parseLoadSubsetOptions } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";

export const PAGINATED_MOVIES_COLLECTION_QUERY_KEY = "query-driven-movies";
export const WATCHLIST_COLLECTION_QUERY_KEY = "query-driven-watchlist";

const MOVIE_SORT_KEYS = [
  "title",
  "overview",
  "vote_average",
  "release_date",
  "popularity",
] as const;

type MoviesWhereClause = {
  page?: { _eq: number };
  q?: { _eq?: string; _ilike?: string };
};

function parseSearchQ(where: MoviesWhereClause | null | undefined) {
  const raw = where?.q?._eq ?? where?.q?._ilike;
  if (!raw) return undefined;
  const stripped = raw.replace(/^%|%$/g, "").trim();
  return stripped || undefined;
}

export const queryDrivenMoviesCollection = createCollection(
  queryCollectionOptions({
    queryKey: [PAGINATED_MOVIES_COLLECTION_QUERY_KEY],
    queryFn: async (ctx) => {
      const where = parseWhereWithHandlers<MoviesWhereClause>(ctx.meta?.loadSubsetOptions?.where); //this will now be available
      const { sorts } = parseLoadSubsetOptions(ctx.meta?.loadSubsetOptions);
      const page = where?.page?._eq ?? 1;
      const q = parseSearchQ(where);
      const primarySort = sorts[0];
      const { sortBy, sortOrder: sortDirection } = resolveSortOrder({
        sortBy: primarySort ? String(primarySort.field.at(-1)) : undefined,
        sortOrder: primarySort?.direction,
        allowedKeys: MOVIE_SORT_KEYS,
        defaultSortBy: "vote_average",
        defaultSortOrder: "desc",
      });
      const response = await getPaginatedFakeMoviesFn({
        data: { page, perPage: 10, q, sortBy, sortDirection, includeTotal: true },
      });
      return response;
    },
    select: (data) => data.items,
    queryClient: getQueryClient(),
    getKey: (item) => item.id,
    autoIndex: "eager",
    defaultIndexType: BasicIndex,
    syncMode: "on-demand",
    staleTime: 1000 * 60 * 60,
  }),
);
```

The query parsing helpers are [here](https://github.com/tigawanna/locally-first/blob/42acbb61aa125a825f921e3a48f7c935db643581/apps/realworld/src/lib/tanstack/db/query-context-parsers.ts)

And just like that, we can now compose our queries, and the filters will be used to determine the next subset that gets loaded.

## Persistence

TanStack Query has some persistence options, but they're backed by IndexedDB and LocalStorage and have somewhat unreliable mutation persistence.

With [version 0.6](https://tanstack.com/blog/tanstack-db-0.6-app-ready-with-persistence-and-includes), TanStack DB introduced persistence via SQLite. This closes the gap in making better offline-first applications with powerful and persisted optimistic mutations:

```ts
import { BasicIndex, createCollection, parseLoadSubsetOptions } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";

import {
  createBrowserWASQLitePersistence,
  openBrowserWASQLiteOPFSDatabase,
  persistedCollectionOptions,
} from "@tanstack/browser-db-sqlite-persistence";

const database = await openBrowserWASQLiteOPFSDatabase({
  databaseName: "my-app.sqlite",
});

const persistence = createBrowserWASQLitePersistence({
  database,
});

const watchlistQueryOptions = queryCollectionOptions({
  queryKey: [WATCHLIST_COLLECTION_QUERY_KEY],
  queryFn: async () => getFakeWatchlistFn(),
  queryClient: getQueryClient(),
  schema: fakeWatchlistSchema,
  getKey: (item) => item.id,
  autoIndex: "eager",
  defaultIndexType: BasicIndex,
  staleTime: 1000 * 60 * 60,
  onInsert: async ({ transaction }) => {
    await Promise.all(
      transaction.mutations.map((mutation) =>
        addFakeWatchlistFn({
          data: {
            id: mutation.modified.id,
            movieId: mutation.modified.movieId,
            createdAt: mutation.modified.createdAt,
            title: mutation.modified.title,
            poster_path: mutation.modified.poster_path,
            overview: mutation.modified.overview,
            vote_average: mutation.modified.vote_average,
            release_date: mutation.modified.release_date,
          } satisfies FakeWatchlistItem,
        }),
      ),
    );
  },
  onDelete: async ({ transaction }) => {
    await Promise.all(
      transaction.mutations.map((mutation) =>
        removeFakeWatchlistFn({ data: { id: String(mutation.key) } }),
      ),
    );
  },
});

export const queryDrivenWatchlistCollection = createCollection({
  ...persistedCollectionOptions({
    persistence,
    schemaVersion: 2,
    ...watchlistQueryOptions,
  }),
  schema: fakeWatchlistSchema,
});
```

## Conclusions

While good, this isn't a perfect system, and I would absolutely like a few features that would make this library even more awesome.

### Wishlist

#### A meta object from `useLiveQuery` into the collection

I'll take the example of our API that returns paged data. We currently map all the subsets with a page so that we can filter on that page, despite every subset that we load ever being the same page for every row in a subset.

```ts
const current_page = // whatever was in the filters
// take a sample subset
const result = [{id: 1, name: "hello"}, {id: 2, name: "hello 2"}, {id: 3, name: "hello 3"}]
// we have to map in the page item
const pagedResult = results.map((item) => ({...item, page: current_page}))

// we can now do this in our live query
.where(({ movies }) => and(eq(movies.page, page), eq(movies.q, q)))
// and access it in our collection
    queryFn: async (ctx) => {
      const where = parseWhereWithHandlers<MoviesWhereClause>(ctx.meta?.loadSubsetOptions?.where);
      const { sorts } = parseLoadSubsetOptions(ctx.meta?.loadSubsetOptions);
      const page = where?.page?._eq ?? 1; // we can finally extract this to pass into our new query for the subset
```

#### `placeholderData` and `isRefetching`

An option like `placeholderData: keepPreviousData` from [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries#better-paginated-queries-with-placeholderdata) in the collection and an `isRefetching` property to be returned from the query hooks.

This would be especially helpful for TanStack Router/Start since they can't use `useTransition` to stop every filter change from transitioning the page into `isLoading` and instead show the last data the user was looking at when using query-driven sync.

I really love this library and have even built more abstractions ([event-sourced-collection](https://www.npmjs.com/package/event-sourced-collection)) over it to take local-first development even further.

## References

- [Example TanStack Start app with TanStack DB](https://github.com/tigawanna/locally-first/tree/main/apps/example)
- [event-sourced-collection](https://www.npmjs.com/package/event-sourced-collection) — event-sourcing based local-first layer on TanStack DB
- [TanStack DB skills](https://tanstack.com/intent/registry/%2540tanstack%252Fdb)
- [TanStack DB official blogs](https://tanstack.com/blog?library=db)
