import { SiteIcon } from "@/components/icon/SiteIcon";

export function RouterPendingComponent() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-2">
      <div className="skeleton bg-base-300/30 flex h-[80vh] w-[95%] items-center justify-center rounded-2xl">
        <SiteIcon
          size={160}
          className="text-landing-sage/50 motion-safe:animate-pulse"
          aria-label="Loading"
        />
      </div>
    </div>
  );
}
