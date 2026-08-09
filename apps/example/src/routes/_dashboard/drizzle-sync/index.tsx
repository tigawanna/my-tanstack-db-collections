import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Loader } from "lucide-react";

const DrizzleSyncDemo = lazy(() =>
  import("./-components/DrizzleSyncDemo").then((mod) => ({ default: mod.DrizzleSyncDemo })),
);

export const Route = createFileRoute("/_dashboard/drizzle-sync/")({
  component: DrizzleSyncPage,
  ssr: false,
});

function DrizzleSyncPage() {
  return (
    <div className="flex h-full min-h-screen w-full">
      <Suspense fallback={<Loader className="m-6 animate-spin" />}>
        <DrizzleSyncDemo />
      </Suspense>
    </div>
  );
}
