import { useState } from "react";
import { RefreshCw, ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEvlogLogsPage } from "@/hooks/logs/use-evlog-logs-page";
import type { EvlogWideEvent } from "@/types/evlog";

function formatTime(timestamp?: string) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(timestamp));
}

function formatSync(sync?: EvlogWideEvent["sync"]) {
  if (!sync?.operation) return "—";

  if (sync.operation === "pull") {
    return `pull · ${sync.returned ?? 0} events`;
  }

  if (sync.rejected) return "push · rejected";

  return `push · ${sync.confirmedCount ?? sync.incomingCount ?? 0} confirmed`;
}

function levelVariant(level?: EvlogWideEvent["level"]) {
  if (level === "error") return "destructive" as const;
  if (level === "warn") return "outline" as const;
  return "secondary" as const;
}

function statusVariant(status?: number) {
  if (!status) return "outline" as const;
  if (status >= 500) return "destructive" as const;
  if (status >= 400) return "outline" as const;
  return "secondary" as const;
}

export function LogsViewer() {
  const {
    dates,
    activeDate,
    selectDate,
    events,
    total,
    page,
    totalPages,
    range,
    canPrevious,
    canNext,
    setPage,
    isLoading,
    isFetching,
    error,
    refresh,
  } = useEvlogLogsPage();

  const [selectedEvent, setSelectedEvent] = useState<EvlogWideEvent | null>(null);
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;

  return (
    <div className="bg-muted/30 mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 rounded-xl p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Request logs</h1>
          <p className="text-muted-foreground text-sm">
            Wide events from evlog&apos;s file drain — sync pushes, pulls, and errors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {dates.length > 0 ? (
            <select
              className="bg-background border-input h-9 rounded-md border px-3 text-sm"
              value={activeDate}
              onChange={(event) => selectDate(event.target.value)}
            >
              {dates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          ) : null}
          <Button variant="outline" size="sm" disabled={isFetching} onClick={() => void refresh()}>
            <RefreshCw className={isFetching ? "animate-spin" : undefined} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-card rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Sync</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ScrollText />
            </EmptyMedia>
            <EmptyTitle>Could not load logs</EmptyTitle>
            <EmptyDescription>{errorMessage}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {!isLoading && !errorMessage && total === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ScrollText />
            </EmptyMedia>
            <EmptyTitle>No log events yet</EmptyTitle>
            <EmptyDescription>
              Trigger a sync or API request, then refresh. Logs are written to{" "}
              <code className="text-xs">.evlog/logs/</code>.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {!isLoading && !errorMessage && total > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Time</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="pr-4">Sync</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow
                    key={`${event.requestId ?? event.timestamp}-${event.path}-${event.method}`}
                    className="cursor-pointer"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <TableCell className="text-muted-foreground pl-4 whitespace-nowrap">
                      {formatTime(event.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={levelVariant(event.level)}>{event.level ?? "info"}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {event.method ?? "—"} {event.path ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(event.status)}>{event.status ?? "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{event.duration ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground pr-4">
                      {formatSync(event.sync)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              Showing {range.start}–{range.end} of {total}
            </p>
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    className={!canPrevious ? "pointer-events-none opacity-50" : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      if (canPrevious) setPage(page - 1);
                    }}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="text-muted-foreground px-2 text-sm">
                    Page {page} of {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    className={!canNext ? "pointer-events-none opacity-50" : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      if (canNext) setPage(page + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      ) : null}

      <Sheet open={selectedEvent !== null} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Log event</SheetTitle>
            <SheetDescription>
              {selectedEvent?.method} {selectedEvent?.path}
            </SheetDescription>
          </SheetHeader>
          <pre className="bg-muted mt-4 max-h-[70vh] overflow-auto rounded-lg p-4 text-xs">
            {JSON.stringify(selectedEvent, null, 2)}
          </pre>
        </SheetContent>
      </Sheet>
    </div>
  );
}
