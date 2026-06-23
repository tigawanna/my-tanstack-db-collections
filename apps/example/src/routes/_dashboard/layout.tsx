import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { syncEvents } from "@/data-access-layer/sync-events";
import { DashboardLayout } from "./-components/dashboard-sidebar/DashboardLayout";
import { getDashboardPrimaryRoutes } from "./-components/dashboard-sidebar/dashboard_routes";

export const Route = createFileRoute("/_dashboard")({
  component: DashboardShell,
});

function DashboardShell() {
  useEffect(() => {
    void syncEvents();
  }, []);

  return <DashboardLayout sidebarRoutes={getDashboardPrimaryRoutes()} sidebarLabel="Menu" />;
}
