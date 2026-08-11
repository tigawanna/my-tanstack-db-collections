import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/_dashboard/settings/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="min-h-screen flex flex-col h-full w-full justify-center items-center">
      <h1>Settings</h1>
      <Settings className="size-10 animate-spin duration-1000 text-primary" />
    </div>
  );
}
