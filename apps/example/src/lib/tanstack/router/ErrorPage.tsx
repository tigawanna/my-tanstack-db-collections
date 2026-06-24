import { useMemo, useState } from "react";
import { Link, useNavigate, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { Check, ChevronDown, Copy, Home, RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AppConfig } from "@/utils/system";
import { withViewTransition } from "@/utils/view-transition";

function formatErrorReport(error: unknown, info?: { componentStack: string }) {
  const sections: string[] = [];

  function appendError(value: unknown, depth = 0) {
    if (depth > 3) {
      sections.push("[cause truncated]");
      return;
    }

    if (value instanceof Error) {
      sections.push(`Name: ${value.name}`);
      sections.push(`Message: ${value.message}`);
      if (value.stack) {
        sections.push(`\nStack:\n${value.stack}`);
      }

      const known = new Set(["name", "message", "stack", "cause"]);
      const extras = Object.keys(value).filter((key) => !known.has(key));
      if (extras.length > 0) {
        const extra: Record<string, unknown> = {};
        for (const key of extras) {
          extra[key] = value[key as keyof Error];
        }
        sections.push(`\nAdditional properties:\n${JSON.stringify(extra, null, 2)}`);
      }

      if (value.cause !== undefined) {
        sections.push("\nCause:");
        appendError(value.cause, depth + 1);
      }
      return;
    }

    if (typeof value === "object" && value !== null) {
      try {
        sections.push(JSON.stringify(value, null, 2));
      } catch {
        sections.push(String(value));
      }
      return;
    }

    sections.push(String(value));
  }

  appendError(error);

  if (info?.componentStack) {
    sections.push(`\nComponent stack:${info.componentStack}`);
  }

  if (typeof window !== "undefined") {
    sections.push(`\nURL: ${window.location.href}`);
  }

  return sections.join("\n");
}

export function ErrorPage({ error, info, reset }: ErrorComponentProps) {
  const router = useRouter();
  const navigate = useNavigate();
  const Icon = AppConfig.icon;
  const [copied, setCopied] = useState(false);
  const errorReport = useMemo(() => formatErrorReport(error, info), [error, info]);

  function handleRetry() {
    withViewTransition(() => {
      reset();
      void router.invalidate();
    });
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(errorReport);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function goHome() {
    withViewTransition(() => {
      void navigate({ to: "/" });
    });
  }

  return (
    <div className="bg-background min-h-dvh font-sans">
      <header className="border-border bg-background/85 sticky top-0 z-50 border-b backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <Icon className="text-primary size-5" />
            <span className="text-foreground font-serif text-xl tracking-tight">
              {AppConfig.wordmark}
              <span className="text-primary">.</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-16">
        <section className="border-border bg-card/80 animate-scale-in relative w-full max-w-xl overflow-hidden rounded-xl border px-8 py-12 text-center shadow-sm sm:px-12 sm:py-14">
          <div className="pointer-events-none absolute -top-16 -left-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--color-primary)_30%,transparent),transparent_68%)]" />
          <div className="pointer-events-none absolute -right-16 -bottom-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--color-primary)_18%,transparent),transparent_68%)]" />

          <div className="relative">
            <div className="border-border bg-background mx-auto mb-6 flex size-16 items-center justify-center rounded-xl border shadow-sm">
              <TriangleAlert className="text-destructive size-7" />
            </div>

            <p className="text-primary mb-3 text-xs font-semibold tracking-[0.2em] uppercase">
              Unexpected error
            </p>
            <h1 className="text-foreground mb-4 font-serif text-4xl font-bold tracking-tight sm:text-5xl">
              Something went wrong
            </h1>
            <p className="text-muted-foreground mx-auto mb-8 max-w-md text-base">
              The app hit an error before this view could finish loading. Try again, copy the
              details, or return home.
            </p>

            <Collapsible className="group/collapsible mx-auto mb-8 max-w-md text-left">
              <CollapsibleTrigger className="border-border bg-background hover:bg-muted/40 flex w-full items-center justify-between gap-2 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors">
                <span>Technical details</span>
                <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="border-border bg-muted/30 mt-2 rounded-lg border px-4 py-3">
                <pre className="text-muted-foreground max-h-48 overflow-auto font-mono text-xs leading-relaxed whitespace-pre-wrap">
                  {errorReport}
                </pre>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => void handleCopy()}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button type="button" className="gap-2" onClick={handleRetry}>
                <RotateCcw className="size-4" />
                Try again
              </Button>
              <Button type="button" variant="secondary" className="gap-2" onClick={goHome}>
                <Home className="size-4" />
                Home
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
