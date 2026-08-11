import { DashboardTheme } from "./DashboardTheme";
import { useSidebar } from "@/components/ui/sidebar";

export function DashboardSidebarFooter() {
  const { state, isMobile } = useSidebar();
  const showDev = import.meta.env.DEV && (state === "expanded" || isMobile);

  return (
    <>
      {showDev ? (
        <div className="hidden px-2 md:block">
          <select
            className="select select-bordered select-sm max-w-full"
            onChange={(e) => {
              document.documentElement.dataset.style = e.target.value;
            }}
          >
            <option value="default">Default</option>
            <option value="vertical">Vertical</option>
            <option value="wipe">Wipe</option>
            <option value="angled">Angled</option>
            <option value="flip">Flip</option>
            <option value="slides">Slides</option>
          </select>
        </div>
      ) : null}
      <DashboardTheme />
    </>
  );
}
