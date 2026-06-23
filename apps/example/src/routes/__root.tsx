import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMiddleware } from "@tanstack/react-start";
import { evlogErrorHandler } from "evlog/nitro/v3";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EventSourcedSyncRunner } from "@/components/common/EventSourcedSyncRunner";
import { queryClient } from "@/lib/tanstack/query/queryclient";
import { ThemeProvider } from "@/lib/tanstack/router/theme-provider";
import { AppConfig } from "@/utils/system";
import appCss from "../styles.css?url";

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
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-style="angled" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider defaultTheme="system" storageKey={AppConfig.themeStorageKey}>
          <QueryClientProvider client={queryClient}>
            <EventSourcedSyncRunner />
            <TooltipProvider>{children}</TooltipProvider>
          </QueryClientProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
