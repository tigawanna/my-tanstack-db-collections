import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Loader } from "lucide-react";

const EventsView = lazy(() =>
  import("./-components/EventsView").then((mod) => ({ default: mod.EventsView })),
);

export const Route = createFileRoute("/_dashboard/events/")({
  component: EventsPage,
  ssr: false,
});

function EventsPage() {
  return (
    <div className="flex h-full min-h-screen w-full">
      <Suspense fallback={<Loader className="animate-spin" />}>
        <EventsView />
      </Suspense>
    </div>
  );
}
