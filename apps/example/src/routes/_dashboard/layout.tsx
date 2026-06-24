import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { ensureAppSettings } from "@/data-access-layer/app-settings";
import { useEventSourcedSync } from "@/hooks/common/use-event-sourced-sync";
import { useSyncEnabled } from "@/hooks/common/use-sync-enabled";
import { DashboardLayout } from "./-components/dashboard-sidebar/DashboardLayout";
import { getDashboardPrimaryRoutes } from "./-components/dashboard-sidebar/dashboard_routes";

export const Route = createFileRoute("/_dashboard")({
  component: DashboardShell,
});

function DashboardShell() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    void ensureAppSettings().then(() => {
      setDbReady(true);
    });
  }, []);

  const syncEnabled = useSyncEnabled(dbReady);
  const syncQuery = useEventSourcedSync(dbReady && syncEnabled);
  const waitingForFirstSync = dbReady && syncEnabled && syncQuery.isPending && !syncQuery.isSuccess;

  if (!dbReady || waitingForFirstSync) {
    return (
      <div className="flex h-svh items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return <DashboardLayout sidebarRoutes={getDashboardPrimaryRoutes()} sidebarLabel="Menu" />;
}
