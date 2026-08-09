import { SidebarItem } from "@/components/sidebar/types";
import { DatabaseBackup, Home, ScrollText, Settings } from "lucide-react";

export function getDashboardPrimaryRoutes(): SidebarItem[] {
  return [
    { title: "Home", href: "/", icon: Home },
    { title: "Events", href: "/events", icon: ScrollText },
    { title: "Logs", href: "/logs", icon: DatabaseBackup },
    { title: "Settings", href: "/settings", icon: Settings },
  ];
}
