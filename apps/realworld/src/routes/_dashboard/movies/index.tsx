import { createFileRoute } from "@tanstack/react-router";
import { PendingComponent } from "../-components/shared/Pendng";
import { ListMovies } from "./-components/ListMovies";
import z from "zod";

const searchParams = z.object({
  q: z.string().optional(),
  page: z.number().optional(),
  perPage: z.number().optional(),
  sortBy: z.string().optional().default("rating"),
  sortDirection: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const Route = createFileRoute("/_dashboard/movies/")({
  validateSearch: searchParams,
  component: RouteComponent,
  pendingComponent: PendingComponent,
  ssr: false,
});

function RouteComponent() {
  return (
    <div className="w-full h-full flex flex-col">
      <ListMovies />
    </div>
  );
}
