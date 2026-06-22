import { getExplorerData } from "@/lib/explorer/server";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/")({
  loader: () => getExplorerData(),
  component: Home,
});

function Home() {
  return <div className="min-h-full">index</div>;
}
