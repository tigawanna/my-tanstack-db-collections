import { createFileRoute } from "@tanstack/react-router";
import { MovieListWithUseQuery } from "./-components/with-use-query";

export const Route = createFileRoute("/_dashboard/movies/with-query")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <MovieListWithUseQuery />
    </div>
  );
}
