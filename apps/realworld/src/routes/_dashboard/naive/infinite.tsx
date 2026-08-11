import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { PendingComponent } from "../-components/shared/Pendng";

const ListMoviesInfinite = lazy(() =>
  import("./-components/ListMoviesInfinite").then((module) => ({
    default: module.ListMoviesInfinite,
  })),
);

export const Route = createFileRoute("/_dashboard/naive/infinite")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
  ssr: false,
});

function RouteComponent() {
  return (
    <div className="w-full h-full flex flex-col">
      <ListMoviesInfinite />
    </div>
  );
}
