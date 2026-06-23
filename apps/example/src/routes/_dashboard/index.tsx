import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { lazy, Suspense } from "react";
import { Loader } from "lucide-react";

const NotesList = lazy(() =>
  import("./-components/notes/NotesList").then((mod) => ({ default: mod.NotesList })),
);

const searchparams = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/_dashboard/")({
  validateSearch: searchparams,
  component: Home,
  ssr: false,
});

function Home() {
  return (
    <div className="min-h-screen flex h-full w-full ">
      <Suspense fallback={<Loader className="animate-spin" />}>
        <NotesList />
      </Suspense>
    </div>
  );
}
