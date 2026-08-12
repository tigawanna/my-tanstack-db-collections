import { SearchBox } from "@/components/common/SearchBox";
import { TSRListPagination } from "@/components/pagination/TSRListPagination";
import { useTSDBQueryMeta } from "@/lib/tanstack/db/use-tsdb-query-meta";
import { and, eq, ilike, useLiveQuery } from "@tanstack/react-db";
import { getRouteApi } from "@tanstack/react-router";
import { useTransition } from "react";
import { MoviesTable } from "../../-components/movies/MoviesTable";
import { PAGINATED_MOVIES_COLLECTION_QUERY_KEY, paginatedMoviesCollection } from "./collection";

const ROUTE_ID = "/_dashboard/query-driven/";
const routeApi = getRouteApi(ROUTE_ID);

export function ListQueryDrivenMovies() {
  const searchParams = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const [isPending, startTransition] = useTransition();

  const page = searchParams.page ?? 1;
  const q = searchParams.q ?? "";

  const { data, isLoading } = useLiveQuery(
    (qb) =>
      qb
        .from({ movies: paginatedMoviesCollection })
        .where(({ movies }) => and(eq(movies.page, page), ilike(movies.q, q)))
        .orderBy(({ movies }) => movies.rating, "desc"),
    [page, q],
  );
  const { meta } = useTSDBQueryMeta(PAGINATED_MOVIES_COLLECTION_QUERY_KEY);

  function setSearchQuery(value: string) {
    startTransition(() => {
      void navigate({
        search: (prev) => ({
          ...prev,
          q: value || undefined,
          page: undefined,
        }),
        replace: true,
      });
    });
  }

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <SearchBox
        value={q}
        onValueChange={setSearchQuery}
        isPending={isPending || isLoading}
        placeholder="Search movies by title..."
        className="max-w-md"
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
