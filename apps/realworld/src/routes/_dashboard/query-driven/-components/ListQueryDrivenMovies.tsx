import { useLiveQuery } from "@tanstack/react-db";
import { MoviesTable } from "../../-components/movies/MoviesTable";
import { paginatedMoviesCollection } from "./collection";

export function ListQueryDrivenMovies() {
  const { data, isLoading } = useLiveQuery((q) =>
    q.from({ movies: paginatedMoviesCollection }).orderBy(({ movies }) => movies.rating, "desc"),
  );
  // const routeApi = getRouteApi(routeID);
  return (
    <div className="w-full h-full flex flex-col gap-4">
      <MoviesTable data={data} isLoading={isLoading} />
    </div>
  );
}
