import { SidebarItem } from "@/components/sidebar/types";
import { Home } from "lucide-react";

export function getDashboardPrimaryRoutes(): SidebarItem[] {
  return [{ title: "Home", href: "/", icon: Home }];
}
