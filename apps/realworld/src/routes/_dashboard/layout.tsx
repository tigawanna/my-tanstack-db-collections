import { createFileRoute } from "@tanstack/react-router";

import { DashboardLayout } from "./-components/dashboard-sidebar/DashboardLayout";
import { getDashboardPrimaryRoutes } from "./-components/dashboard-sidebar/dashboard_routes";
import { PendingComponent } from "./-components/shared/Pendng";

export const Route = createFileRoute("/_dashboard")({
  component: DashboardShell,
  pendingComponent: PendingComponent,
});

function DashboardShell() {
  return <DashboardLayout sidebarRoutes={getDashboardPrimaryRoutes()} sidebarLabel="Menu" />;
}
