import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { ensureDb } from "@/data-access-layer/collections";
import { useEventSourcedSync } from "@/hooks/common/use-event-sourced-sync";
import { DashboardLayout } from "./-components/dashboard-sidebar/DashboardLayout";
import { getDashboardPrimaryRoutes } from "./-components/dashboard-sidebar/dashboard_routes";

export const Route = createFileRoute("/_dashboard")({
  component: DashboardShell,
});

function DashboardShell() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    void ensureDb().then(() => {
      setDbReady(true);
    });
  }, []);

  const syncQuery = useEventSourcedSync(dbReady);
  const waitingForFirstSync = dbReady && syncQuery.isPending && !syncQuery.isSuccess;

  if (!dbReady || waitingForFirstSync) {
    return (
      <div className="flex h-svh items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return <DashboardLayout sidebarRoutes={getDashboardPrimaryRoutes()} sidebarLabel="Menu" />;
}
