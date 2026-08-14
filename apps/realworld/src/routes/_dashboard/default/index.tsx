import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { PendingComponent } from "../-components/shared/Pendng";

const ExperimentsPage = lazy(() =>
  import("./-components/ListMovies").then((module) => ({ default: module.ListMovies })),
);

export const Route = createFileRoute("/_dashboard/default/")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
  ssr: false,
});

function RouteComponent() {
  return (
    <div className="w-full h-full flex flex-col">
      <ExperimentsPage />
    </div>
  );
}
