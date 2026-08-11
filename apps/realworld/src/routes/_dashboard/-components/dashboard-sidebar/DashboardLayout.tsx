import { SidebarLinks } from "@/components/sidebar/SidebarLinks";
import { SidebarItem } from "@/components/sidebar/types";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TSRBreadCrumbs } from "@/lib/tanstack/router/TSRBreadCrumbs";
import { Outlet } from "@tanstack/react-router";
import { DashboardSidebarFooter } from "./DashboardSidebarFooter";
import { DashboardSidebarHeader } from "./DashboardSidebarHeader";

interface DashboardLayoutProps {
  sidebarRoutes: SidebarItem[];
  sidebarLabel: string;
  sidebar_props?: React.ComponentProps<typeof Sidebar>;
}

export function DashboardLayout({
  sidebarRoutes,
  sidebarLabel,
  sidebar_props,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={false} className="h-svh overflow-hidden">
      <Sidebar collapsible="icon" {...sidebar_props}>
        <SidebarHeader>
          <DashboardSidebarHeader />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="bg-base-300">
            <SidebarGroupLabel className="text-sm font-semibold tracking-wide">
              {sidebarLabel}
            </SidebarGroupLabel>
            <SidebarLinks links={sidebarRoutes} />
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="gap-3 pb-3">
          <DashboardSidebarFooter />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-h-0">
        <header className="bg-base-100 sticky top-0 z-30 flex h-16 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <TSRBreadCrumbs />
          </div>
        </header>
        <div className="@container/main flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-auto p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
