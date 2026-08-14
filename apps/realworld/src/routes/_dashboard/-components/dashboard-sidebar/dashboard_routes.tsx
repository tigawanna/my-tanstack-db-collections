import { SidebarItem } from "@/components/sidebar/types";
import { DatabaseBackup, FileVideoCamera, Home, Settings, TvMinimalPlay } from "lucide-react";

export function getDashboardPrimaryRoutes(): SidebarItem[] {
  return [
    { title: "Home", href: "/", icon: Home },
    { title: "Movies", href: "/movies", icon: TvMinimalPlay },
    { title: "Watchlist", href: "/watchlist", icon: FileVideoCamera },
    { title: "Logs", href: "/logs", icon: DatabaseBackup },
    { title: "Settings", href: "/settings", icon: Settings },
  ];
}
