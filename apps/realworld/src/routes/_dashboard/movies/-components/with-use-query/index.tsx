import { getPaginatedFakeMoviesFn } from "@/fake-data/fake-moviees";
import { useQuery } from "@tanstack/react-query";
import { eq, isUndefined, not, useLiveQuery } from "@tanstack/react-db";
import {
  queryDrivenMoviesCollection,
  queryDrivenWatchlistCollection,
} from "../query-driven-collection";

export function MovieListWithUseQuery() {
  const { data, isLoading } = useLiveQuery((qb) =>
    qb
      .from({ movies: queryDrivenMoviesCollection })
      .join({ watchlist: queryDrivenWatchlistCollection }, ({ movies, watchlist }) =>
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
