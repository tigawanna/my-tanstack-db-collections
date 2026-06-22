import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/")({
  component: Home,
});

function Home() {
  return <div className="min-h-full">index</div>;
}
