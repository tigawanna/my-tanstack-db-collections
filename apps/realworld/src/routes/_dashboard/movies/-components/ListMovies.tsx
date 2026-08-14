import { SearchBox } from "@/components/common/SearchBox";
import { usePageSearchQuery } from "@/components/common/use-page-search-query";
import { TSRListPagination } from "@/components/pagination/TSRListPagination";
import { resolveSortOrder } from "@/lib/tanstack/db/pagination";
import { createSortableColumns } from "@/lib/tanstack/db/sortable-columns";
import { TanstackDBColumnFilters } from "@/lib/tanstack/db/TanstackDBColumnfilters";
import { useTSDBQueryMeta } from "@/lib/tanstack/db/use-tsdb-query-meta";
import { and, eq, isUndefined, not, useLiveQuery } from "@tanstack/react-db";
import { getRouteApi } from "@tanstack/react-router";
import { MoviesTable, type Movie } from "../../-components/movies/MoviesTable";
import {
  PAGINATED_MOVIES_COLLECTION_QUERY_KEY,
  queryDrivenMoviesCollection,
  queryDrivenWatchlistCollection,
} from "./query-driven-collection";

const ROUTE_ID = "/_dashboard/movies/";
const routeApi = getRouteApi(ROUTE_ID);

const MOVIE_SORT_KEYS = ["title", "description", "rating", "releaseDate"] as const;

export function ListMovies() {
  const { inputValue, onSearchChange, isDebouncing } = usePageSearchQuery(ROUTE_ID);

  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  const page = search.page ?? 1;
  const q = (search.q ?? "").trim();
  const { sortBy, sortOrder: sortDirection } = resolveSortOrder({
    sortBy: search.sortBy,
    sortOrder: search.sortDirection,
    allowedKeys: MOVIE_SORT_KEYS,
    defaultSortBy: "rating",
    defaultSortOrder: "desc",
  });

  const { data, isLoading } = useLiveQuery(
    (qb) =>
      qb
        .from({ movies: queryDrivenMoviesCollection })
        .leftJoin({ watchlist: queryDrivenWatchlistCollection }, ({ movies, watchlist }) =>
          eq(movies.id, watchlist.movieId),
        )
        .where(({ movies }) => and(eq(movies.page, page), eq(movies.q, q)))
        .orderBy(({ movies }) => movies[sortBy], sortDirection)
        .select(({ movies, watchlist }) => ({
          id: movies.id,
          title: movies.title,
          description: movies.description,
          image: movies.image,
          rating: movies.rating,
          releaseDate: movies.releaseDate,
          page: movies.page,
          q: movies.q,
          watchlistId: watchlist.id,
          onWatchlist: not(isUndefined(watchlist)),
        })),
    [page, q, sortBy, sortDirection],
  );
  const { meta } = useTSDBQueryMeta(PAGINATED_MOVIES_COLLECTION_QUERY_KEY, {
    page,
    q,
  });
  const sortableColumns = createSortableColumns(queryDrivenMoviesCollection, [
    { value: "title", label: "Title" },
    { value: "description", label: "Description" },
    { value: "rating", label: "Rating" },
    { value: "releaseDate", label: "Release Date" },
  ]);
  console.log({ meta, data });

  function toggleWatchlist(movie: Movie & { watchlistId?: string | null; onWatchlist?: boolean }) {
    if (movie.onWatchlist && movie.watchlistId) {
      queryDrivenWatchlistCollection.delete(movie.watchlistId);
      return;
    }
    queryDrivenWatchlistCollection.insert({
      id: crypto.randomUUID(),
      movieId: movie.id,
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div className="flex gap-3 items-end">
        <SearchBox
          keyword={inputValue}
          setKeyword={(value) => onSearchChange(value)}
          isDebouncing={isDebouncing}
          inputProps={{
            placeholder: "Search lessons…",
          }}
        />
        <TanstackDBColumnFilters
          collection={queryDrivenMoviesCollection}
          sortableColumns={sortableColumns}
          defaultSortBy="rating"
          defaultSortDirection="desc"
          search={search}
          navigate={navigate}
        />
      </div>
      <MoviesTable
        data={data}
        isLoading={isLoading}
        onToggleWatchlist={toggleWatchlist}
        onDetailsClick={(movie) => navigate({ to: "/movies/$movie", params: { movie: movie.id } })}
      />
      {meta?.totalPages ? (
        <TSRListPagination
          routeID={ROUTE_ID}
          totalPages={meta.totalPages}
          data-test="lessons-pagination"
        />
      ) : null}
    </div>
  );
}
