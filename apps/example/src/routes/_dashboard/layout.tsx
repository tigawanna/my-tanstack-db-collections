import { createFileRoute } from "@tanstack/react-router";
import { useSyncEnabled } from "event-sourced-collection/react";
import { useEffect, useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { APP_SETTINGS_ID, ensureAppSettings } from "@/data-access-layer/app-settings";
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
    void ensureAppSettings().then(() => {
      setDbReady(true);
    });
  }, []);

  const syncEnabled = useSyncEnabled({
    enabled: dbReady,
    settingsId: APP_SETTINGS_ID,
    ensureDb,
  });
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
