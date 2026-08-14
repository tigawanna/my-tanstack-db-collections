import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tmdbImageUrl } from "@/fake-data/tmdb";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { Loader, Star } from "lucide-react";
import {
  queryDrivenMoviesCollection,
  queryDrivenWatchlistCollection,
} from "../-components/query-driven-collection";

export const Route = createFileRoute("/_dashboard/movies/$movie/")({
  component: RouteComponent,
  ssr: false,
});

function RouteComponent() {
  const { movie: movieId } = Route.useParams();
  const { data, isLoading } = useLiveQuery(
    (q) =>
      q
        .from({ movie: queryDrivenMoviesCollection })
        .leftJoin({ watchlist: queryDrivenWatchlistCollection }, ({ movie, watchlist }) =>
          eq(movie.id, watchlist.movieId),
        )
        .where(({ movie }) => eq(movie.id, Number(movieId)))
        .select(({ movie, watchlist }) => ({
          id: movie.id,
          title: movie.title,
          overview: movie.overview,
          poster_path: movie.poster_path,
          vote_average: movie.vote_average,
          release_date: movie.release_date,
          watchlistId: watchlist.id,
          onWatchlist: watchlist.id ? true : false,
        }))
        .findOne(),
    [movieId],
  );
  if (isLoading)
    return (
      <div className="h-screen flex w-full flex-col items-center justify-center ">
        <Loader className="w-10 h-10 animate-spin" />
      </div>
    );

  const poster = tmdbImageUrl(data?.poster_path, "w342");

  return (
    <div className="min-h-screen flex h-full w-full flex-col items-center p-6">
      <Card className="max-w-xl w-full overflow-hidden py-0">
        {poster ? (
          <img src={poster} alt="" className="aspect-[2/3] max-h-80 w-full object-cover" />
        ) : null}
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-wrap">{data?.title}</CardTitle>
          {data ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
              {data.vote_average.toFixed(1)}
              <span>·</span>
              <span>{data.release_date}</span>
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="pb-6">
          <p className="text-sm text-muted-foreground text-pretty">{data?.overview}</p>
        </CardContent>
      </Card>
    </div>
  );
}
