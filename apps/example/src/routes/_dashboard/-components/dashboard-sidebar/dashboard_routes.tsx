import { SidebarItem } from "@/components/sidebar/types";
import { Database, DatabaseBackup, Home, ScrollText, Settings } from "lucide-react";

export function getDashboardPrimaryRoutes(): SidebarItem[] {
  return [
    { title: "Home", href: "/", icon: Home },
    { title: "Events", href: "/events", icon: ScrollText },
    { title: "Drizzle sync", href: "/drizzle-sync", icon: Database },
    { title: "Logs", href: "/logs", icon: DatabaseBackup },
    { title: "Settings", href: "/settings", icon: Settings },
  ];
}
