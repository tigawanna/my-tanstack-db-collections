import { TSRListPagination } from "@/components/pagination/TSRListPagination";
import { useTSDBQueryMeta } from "@/lib/tanstack/db/use-tsdb-query-meta";
import { useLiveQuery, eq } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import { MoviesTable } from "../../-components/movies/MoviesTable";
import { PAGINATED_MOVIES_COLLECTION_QUERY_KEY, paginatedMoviesCollection } from "./collection";
import { useSearch } from "@tanstack/react-router";

const ROUTE_ID = "/_dashboard/query-driven/";

export function ListQueryDrivenMovies() {
  const searchParams = useSearch({ from: ROUTE_ID });

  const q = useQuery({
    queryKey: [PAGINATED_MOVIES_COLLECTION_QUERY_KEY + "kirk"],
    queryFn: () => {
      return {
        data: {
          items: [],
          totalItems: 666,
          totalPages: 666,
          page: 666,
          perPage: 666,
        },
      };
    },
  });

  const page = searchParams.page ?? 1;

  const { data, isLoading } = useLiveQuery(
    (q) =>
      q
        .from({ movies: paginatedMoviesCollection })
        .where(({ movies }) => eq(movies.page, page))
        .orderBy(({ movies }) => movies.rating, "desc"),
    [page],
  );
  const { meta } = useTSDBQueryMeta(PAGINATED_MOVIES_COLLECTION_QUERY_KEY);

  return (
    <div className="w-full h-full flex flex-col gap-4">
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
