import { EventSourcedSyncRunner } from "@/components/common/EventSourcedSyncRunner";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getQueryClient } from "@/lib/tanstack/query/queryclient";
import { RouterErrorComponent } from "@/lib/tanstack/router/RouterErrorComponent";
import { RouterNotFoundComponent } from "@/lib/tanstack/router/RouterNotFoundComponent";
import { ThemeProvider } from "@/lib/tanstack/router/theme-provider";
import { AppConfig } from "@/utils/system";
import { QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { evlogErrorHandler } from "evlog/nitro/v3";
import appCss from "../styles.css?url";
import paginationStyles from "@/components/pagination/pagination.css?url";
import { lazy, Suspense } from "react";
import { z } from "zod";

const TanstackDevtools = lazy(() =>
  import("@/lib/tanstack/devtools/devtools").then((module) => ({
    default: module.TanstackDevtools,
  })),
);

const globalSearch = z.object({
  globalPage: z.number().optional(),
});

export const Route = createRootRoute({
  server: {
    middleware: [createMiddleware().server(evlogErrorHandler)],
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: AppConfig.name,
        description: AppConfig.description,
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "stylesheet",
        href: paginationStyles,
      },
    ],
  }),
  notFoundComponent: RouterNotFoundComponent,
  errorComponent: RouterErrorComponent,
  shellComponent: RootDocument,
  validateSearch: globalSearch,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-style="angled" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider defaultTheme="system" storageKey={AppConfig.themeStorageKey}>
          <QueryClientProvider client={getQueryClient()}>
            <EventSourcedSyncRunner />
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster richColors closeButton />
            <Suspense fallback={null}>
              <TanstackDevtools />
            </Suspense>
          </QueryClientProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
