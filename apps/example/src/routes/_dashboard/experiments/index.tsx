import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import z from "zod";

const ExperimentsPage = lazy(() =>
  import("./-components/ExperimentsPage").then((module) => ({ default: module.ExperimentsPage })),
);
// const searchParams = z.object({
//   globalPage: z.number().optional(),
// });

export const Route = createFileRoute("/_dashboard/experiments/")({
  component: RouteComponent,
  // validateSearch: searchParams,
});

function RouteComponent() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <ExperimentsPage />
    </div>
  );
}

// const navigate = Route.useNavigate()
//  navigate({search:{globalPage:1}})
