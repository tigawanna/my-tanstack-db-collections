import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { queryDrivenWatchlistCollection } from "../movies/-components/query-driven-collection";
import { Loader } from "lucide-react";

export const Route = createFileRoute("/_dashboard/watchlist/")({
  component: RouteComponent,
  ssr: false,
});

function RouteComponent() {
  const { data: watchlist, isLoading } = useLiveQuery((q) =>
    q
      .from({ watchlist: queryDrivenWatchlistCollection })
      .orderBy(({ watchlist }) => watchlist.createdAt, "desc"),
  );

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col gap-4">
        {" "}
        <Loader className="w-4 h-4 animate-spin" />
      </div>
    );
  }
  if (!watchlist || watchlist.length === 0) {
    return (
      <div className="w-full h-full flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Watchlist</h1>
        <p className="text-sm text-muted-foreground">No watchlist items found</p>
      </div>
    );
  }
  return (
    <div className="w-full h-full flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Watchlist</h1>
      <div className="w-full h-full flex flex-col gap-4">
        {watchlist.map((item) => (
          <div key={item.id}>
            <h2 className="text-lg font-bold">{item.movieId}</h2>
            <p className="text-sm text-muted-foreground">{item.createdAt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
