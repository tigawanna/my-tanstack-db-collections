import { useLiveQuery } from "@tanstack/react-db";
import { MoviesTable } from "../../-components/movies/MoviesTable";
import { moviesCollection } from "./collection";

export function ListMovies() {
  const { data, isLoading } = useLiveQuery((q) => q.from({ movies: moviesCollection }));

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <MoviesTable data={data} isLoading={isLoading} />
    </div>
  );
}
