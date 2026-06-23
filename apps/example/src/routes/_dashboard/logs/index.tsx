import { createFileRoute } from "@tanstack/react-router";

import { LogsViewer } from "./-components/LogsViewer";

export const Route = createFileRoute("/_dashboard/logs/")({
  component: LogsPage,
  ssr: false,
});

function LogsPage() {
  return (
    <div className="min-h-screen flex h-full w-full ">
      <LogsViewer />
    </div>
  );
}
