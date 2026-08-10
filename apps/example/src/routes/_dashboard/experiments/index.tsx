import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const ExperimentsPage = lazy(() =>
  import("./-components/ExperimentsPage").then((module) => ({ default: module.ExperimentsPage })),
);

export const Route = createFileRoute("/_dashboard/experiments/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <ExperimentsPage />
    </div>
  );
}
