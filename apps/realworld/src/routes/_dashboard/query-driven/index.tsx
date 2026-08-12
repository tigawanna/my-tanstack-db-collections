import { createFileRoute } from "@tanstack/react-router";
import { PendingComponent } from "../-components/shared/Pendng";
import { ListQueryDrivenMovies } from "./-components/ListQueryDrivenMovies";
import z from "zod";

const searchParams = z.object({
  q: z.string().optional(),
  page: z.number().optional(),
  perPage: z.number().optional(),
});

export const Route = createFileRoute("/_dashboard/query-driven/")({
  validateSearch: searchParams,
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
