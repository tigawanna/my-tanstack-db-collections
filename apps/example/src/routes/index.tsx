import { getExplorerData } from "@/lib/explorer/server";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  loader: () => getExplorerData(),
  component: Home,
});

function Home() {
  return <div className="min-h-screen p-8">index</div>;
}
