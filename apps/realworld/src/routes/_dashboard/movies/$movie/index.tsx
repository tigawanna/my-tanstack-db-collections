import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fakeWatchlistCollection } from "@/fake-data/fake-atchlist";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { Loader } from "lucide-react";
import { queryDrivenMoviesCollection } from "../-components/query-driven-collection";

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
        .leftJoin({ watchlist: fakeWatchlistCollection }, ({ movie, watchlist }) =>
          eq(movie.id, watchlist.movieId),
        )
        .where(({ movie }) => eq(movie.id, movieId))
        .select(({ movie, watchlist }) => ({
          id: movie.id,
          title: movie.title,
          description: movie.description,
          image: movie.image,
          rating: movie.rating,
          releaseDate: movie.releaseDate,
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
  return (
    <div className="min-h-screen flex h-full w-full flex-col items-center ">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{data?.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{data?.description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
