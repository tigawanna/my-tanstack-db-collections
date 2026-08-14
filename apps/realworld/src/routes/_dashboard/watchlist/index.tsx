import { Button } from "@/components/ui/button";
import { tmdbImageUrl } from "@/fake-data/tmdb";
import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookmarkX, Loader, Star } from "lucide-react";
import { queryDrivenWatchlistCollection } from "../movies/-components/query-driven-collection";

export const Route = createFileRoute("/_dashboard/watchlist/")({
  component: RouteComponent,
  ssr: false,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { data: watchlist, isLoading } = useLiveQuery((q) =>
    q
      .from({ watchlist: queryDrivenWatchlistCollection })
      .orderBy(({ watchlist }) => watchlist.createdAt, "desc"),
  );

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader className="size-4 animate-spin" />
      </div>
    );
  }
  if (!watchlist || watchlist.length === 0) {
    return (
      <div className="flex h-full w-full flex-col gap-2 p-1">
        <h1 className="text-2xl font-bold">Watchlist</h1>
        <p className="text-sm text-muted-foreground">Save movies from the list to see them here.</p>
      </div>
    );
  }
  return (
    <div className="flex h-full w-full flex-col gap-4 p-1">
      <h1 className="text-2xl font-bold">Watchlist</h1>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {watchlist.map((item) => {
          const poster = tmdbImageUrl(item.poster_path, "w185");
          return (
            <li key={item.id}>
              <article className="bg-card flex overflow-hidden rounded-xl border">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 text-left"
                  onClick={() =>
                    navigate({ to: "/movies/$movie", params: { movie: String(item.movieId) } })
                  }
                >
                  {poster ? (
                    <img src={poster} alt="" className="h-36 w-24 shrink-0 object-cover" />
                  ) : (
                    <div className="bg-muted h-36 w-24 shrink-0" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
                    <h2 className="line-clamp-2 text-sm font-semibold text-wrap">{item.title}</h2>
                    <p className="text-muted-foreground flex items-center gap-1.5 text-xs tabular-nums">
                      <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
                      {item.vote_average.toFixed(1)}
                      <span>·</span>
                      <span>{item.release_date}</span>
                    </p>
                    <p className="text-muted-foreground line-clamp-3 text-xs text-pretty">
                      {item.overview}
                    </p>
                  </div>
                </button>
                <div className="p-2">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Remove from watchlist"
                    onClick={() => queryDrivenWatchlistCollection.delete(item.id)}
                  >
                    <BookmarkX />
                  </Button>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
