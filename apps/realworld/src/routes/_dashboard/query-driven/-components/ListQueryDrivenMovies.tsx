import { SearchBox } from "@/components/common/SearchBox";
import { usePageSearchQuery } from "@/components/common/use-page-search-query";
import { TSRListPagination } from "@/components/pagination/TSRListPagination";
import { useTSDBQueryMeta } from "@/lib/tanstack/db/use-tsdb-query-meta";
import { and, eq, useLiveQuery } from "@tanstack/react-db";
import { getRouteApi } from "@tanstack/react-router";
import { MoviesTable } from "../../-components/movies/MoviesTable";
import { PAGINATED_MOVIES_COLLECTION_QUERY_KEY, paginatedMoviesCollection } from "./collection";

const ROUTE_ID = "/_dashboard/query-driven/";
const routeApi = getRouteApi(ROUTE_ID);

export function ListQueryDrivenMovies() {
  const { inputValue, onSearchChange, isDebouncing } = usePageSearchQuery(ROUTE_ID);
  const searchParams = routeApi.useSearch();

  const page = searchParams.page ?? 1;
  const q = (searchParams.q ?? "").trim();

  const { data, isLoading } = useLiveQuery(
    (qb) =>
      qb
        .from({ movies: paginatedMoviesCollection })
        .where(({ movies }) => and(eq(movies.page, page), eq(movies.q, q)))
        .orderBy(({ movies }) => movies.rating, "desc"),
    [page, q],
  );
  const { meta } = useTSDBQueryMeta(PAGINATED_MOVIES_COLLECTION_QUERY_KEY, {
    page,
    q,
  });

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <SearchBox
        keyword={inputValue}
        setKeyword={(value) => onSearchChange(value)}
        isDebouncing={isDebouncing}
        inputProps={{
          placeholder: "Search lessons…",
        }}
      />
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
