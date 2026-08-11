import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

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
      <h1>Home</h1>
    </div>
  );
}
