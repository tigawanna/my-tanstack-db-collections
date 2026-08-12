import { useLiveQuery } from "@tanstack/react-db";
import { MoviesTable } from "../../-components/movies/MoviesTable";
import { PAGINATED_MOVIES_COLLECTION_QUERY_KEY, paginatedMoviesCollection } from "./collection";
import { TSRListPagination } from "@/components/pagination/TSRListPagination";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTSDBQueryMeta } from "@/lib/tanstack/db/use-tsdb-query-meta";

const ROUTE_ID = "/_dashboard/query-driven/";

export function ListQueryDrivenMovies() {
  const queryOne = useQuery({
    queryKey: [PAGINATED_MOVIES_COLLECTION_QUERY_KEY, "meta-1"],
    queryFn: () => {
      return {
        ko: true,
        payload: "query-one",
      };
    },
  });
  const queryTwo = useQuery({
    queryKey: [PAGINATED_MOVIES_COLLECTION_QUERY_KEY, "meta-1"],
    queryFn: () => {
      return {
        ko: true,
        payload: "query-one",
      };
    },
  });
  const queryThree = useQuery({
    queryKey: [PAGINATED_MOVIES_COLLECTION_QUERY_KEY, "meta-3"],
    queryFn: () => {
      return {
        ko: true,
        payload: "query-three",
      };
    },
  });
  const { data, isLoading } = useLiveQuery((q) =>
    q.from({ movies: paginatedMoviesCollection }).orderBy(({ movies }) => movies.rating, "desc"),
  );
  const meta = useTSDBQueryMeta(PAGINATED_MOVIES_COLLECTION_QUERY_KEY);
  // console.log("meta ===  ",meta);
  // const routeApi = getRouteApi(routeID);
  return (
    <div className="w-full h-full flex flex-col gap-4">
      <MoviesTable data={data} isLoading={isLoading} />
      <TSRListPagination routeID={ROUTE_ID} totalPages={100} data-test="lessons-pagination" />
    </div>
  );
}
