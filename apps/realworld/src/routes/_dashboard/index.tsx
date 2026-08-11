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
  },
  {
    label: "Naive Infinite",
    href: "/naive/infinite",
  },
  {
    label: "Logs",
    href: "/logs",
  },
  {
    label: "Settings",
    href: "/settings",
  },
];

function Home() {
  return (
    <div className="min-h-screen flex h-full w-full flex-col items-center justify-center ">
      <div className="flex flex-col items-center justify-center">
        <h1>Home</h1>
        <div className="flex flex-col items-center justify-center">
          {links.map((link) => (
            <Link key={link.href} to={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
