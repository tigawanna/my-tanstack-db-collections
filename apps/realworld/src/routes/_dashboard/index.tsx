import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";

const searchparams = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/_dashboard/")({
  validateSearch: searchparams,
  component: Home,
  ssr: false,
});

const links = [
  {
    label: "Naive",
    href: "/naive/",
    description:
      "All 1000 items are loaded at once. A lazy table or list can be used to manage the rendering in an effecient manner",
  },
  {
    label: "Naive Infinite",
    href: "/naive/infinite",
    description:
      "leverages useLiveinfinitequery to load the items , It still loads all the items inot the collection at once and gives you controls to load a sumbset inot the hook",
  },
  {
    label: "Query driven",
    href: "/query-driven",
    description:
      "leverages useLiveQuery combined with sync-mode on-demnd and dynamic query inputs to load subsets of the data",
  },
  {
    label: "Logs",
    href: "/logs",
    description: "Logs of the app by reading the logs emitted to a file by evlog",
  },
  {
    label: "Settings",
    href: "/settings",
    description: "Settings of the app by reading the settings from the collection",
  },
];

function Home() {
  return (
    <div className="min-h-screen flex h-full w-full flex-col items-center justify-center ">
      <div className="h-full w-full grid grid-cols-2 gap-4">
        {links.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className="p-4 rounded-md bg-primary/10 flex flex-col hover:bg-primary/20 transition-all duration-300 items-center justify-center"
          >
            <h1 className="text-2xl font-bold">{link.label}</h1>
            <p className="text-sm t text-primary text-center">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
