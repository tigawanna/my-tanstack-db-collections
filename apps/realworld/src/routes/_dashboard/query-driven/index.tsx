import { createFileRoute } from "@tanstack/react-router";
import { PendingComponent } from "../-components/shared/Pendng";
import { ListQueryDrivenMovies } from "./-components/ListQueryDrivenMovies";

export const Route = createFileRoute("/_dashboard/query-driven/")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
  ssr: false,
});

function RouteComponent() {
  return (
    <div className="w-full h-full flex flex-col">
      <ListQueryDrivenMovies />
    </div>
  );
}
