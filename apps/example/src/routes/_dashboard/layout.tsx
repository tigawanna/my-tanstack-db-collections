import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { syncEvents } from "@/data-access-layer/sync-events";
import { DashboardLayout } from "./-components/dashboard-sidebar/DashboardLayout";
import { getDashboardPrimaryRoutes } from "./-components/dashboard-sidebar/dashboard_routes";

export const Route = createFileRoute("/_dashboard")({
  component: DashboardShell,
});

function DashboardShell() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void syncEvents().then(() => {
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <div className="flex h-svh items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return <DashboardLayout sidebarRoutes={getDashboardPrimaryRoutes()} sidebarLabel="Menu" />;
}
