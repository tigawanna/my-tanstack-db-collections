import { createFileRoute } from "@tanstack/react-router";
import { PendingComponent } from "../-components/shared/Pendng";

export const Route = createFileRoute("/_dashboard/query-driven/")({
  component: RouteComponent,
  pendingComponent: PendingComponent,
  ssr: false,
});

function RouteComponent() {
  return (
    <div className="w-full h-full flex flex-col">
      <h1 className="text-2xl font-bold">Query Driven</h1>
    </div>
  );
}
