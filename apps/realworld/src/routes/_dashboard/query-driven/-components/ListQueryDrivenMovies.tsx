import { SearchBox } from "@/components/common/SearchBox";
import { usePageSearchQuery } from "@/components/common/use-page-search-query";
import { TSRListPagination } from "@/components/pagination/TSRListPagination";
import { resolveSortOrder } from "@/lib/tanstack/db/pagination";
import { TanstackDBColumnFilters } from "@/lib/tanstack/db/TanstackDBColumnfilters";
import { createSortableColumns } from "@/lib/tanstack/db/sortable-columns";
import { useTSDBQueryMeta } from "@/lib/tanstack/db/use-tsdb-query-meta";
import { and, eq, useLiveQuery } from "@tanstack/react-db";
import { getRouteApi } from "@tanstack/react-router";
import { MoviesTable } from "../../-components/movies/MoviesTable";
import { PAGINATED_MOVIES_COLLECTION_QUERY_KEY, paginatedMoviesCollection } from "./collection";

const ROUTE_ID = "/_dashboard/query-driven/";
const routeApi = getRouteApi(ROUTE_ID);

const MOVIE_SORT_KEYS = ["title", "description", "rating", "releaseDate"] as const;

export function ListQueryDrivenMovies() {
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
        .from({ movies: paginatedMoviesCollection })
        .where(({ movies }) => and(eq(movies.page, page), eq(movies.q, q)))
        .orderBy(({ movies }) => movies[sortBy], sortDirection),
    [page, q, sortBy, sortDirection],
  );
  const { meta } = useTSDBQueryMeta(PAGINATED_MOVIES_COLLECTION_QUERY_KEY, {
    page,
    q,
  });
  const sortableColumns = createSortableColumns(paginatedMoviesCollection, [
    { value: "title", label: "Title" },
    { value: "description", label: "Description" },
    { value: "rating", label: "Rating" },
    { value: "releaseDate", label: "Release Date" },
  ]);
  console.log({ meta, data });

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
          collection={paginatedMoviesCollection}
          sortableColumns={sortableColumns}
          defaultSortBy="rating"
          defaultSortDirection="desc"
          search={search}
          navigate={navigate}
        />
      </div>
      <MoviesTable data={data} isLoading={isLoading} />
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
