import { useEffect, useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import type { DeadLetterEntry } from "event-sourced-collection";
import { Inbox, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/data-access-layer/collections";
import {
  buildPaginatedResponseFromPeek,
  normalizePaginationParams,
} from "@/lib/tanstack/db/pagination";

import { formatEventDate } from "./event-view";

const DEADLETTER_PAGE_SIZE = 5;

export function DeadLetterList() {
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const {
    page: currentPage,
    perPage,
    offset,
  } = normalizePaginationParams({ page }, { perPage: DEADLETTER_PAGE_SIZE });

  const { data, isLoading } = useLiveQuery(
    (query) =>
      query
        .from({ event: db.collections.deadletter })
        .orderBy(({ event }) => event.localSeq, "desc")
        .limit(perPage + 1)
        .offset(offset),
    [currentPage, perPage, offset],
  );

  const { items, pagination } = buildPaginatedResponseFromPeek({
    items: (data ?? []) as DeadLetterEntry[],
    page: currentPage,
    perPage,
  });

  useEffect(() => {
    if (!isLoading && items.length === 0 && currentPage > 1) {
      setPage(currentPage - 1);
    }
  }, [isLoading, items.length, currentPage]);

  const canPrevious = currentPage > 1;
  const canNext = pagination.hasMore;
  const showPager = !isLoading && (items.length > 0 || currentPage > 1);

  async function retryOne(eventId: string) {
    setBusyId(eventId);
    try {
      const count = await db.retryDeadLetter(eventId);
      toast.success(count > 0 ? "Requeued for sync" : "Nothing to retry");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Retry failed");
    } finally {
      setBusyId(null);
    }
  }

  async function discardOne(eventId: string) {
    setBusyId(eventId);
    try {
      const count = await db.discardDeadLetter(eventId);
      toast.message(count > 0 ? "Discarded dead-letter event" : "Nothing to discard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Discard failed");
    } finally {
      setBusyId(null);
    }
  }

  async function retryAll() {
    setBusyId("*");
    try {
      const count = await db.retryDeadLetter();
      toast.success(count > 0 ? `Requeued ${count} event(s)` : "Dead letter is empty");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Retry all failed");
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) {
    return <DeadLetterSkeleton />;
  }

  if (items.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox />
          </EmptyMedia>
          <EmptyTitle>Dead letter is empty</EmptyTitle>
          <EmptyDescription>
            Permanently rejected events and exhausted retries appear here. Use Retry to send them
            through the outbox again.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busyId !== null}
          onClick={() => void retryAll()}
        >
          {busyId === "*" ? <Spinner className="size-4" /> : <RotateCcw className="size-4" />}
          Retry all
        </Button>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Collection</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Failed</TableHead>
              <TableHead className="pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((entry) => {
              const busy = busyId === entry.eventId || busyId === "*";
              return (
                <TableRow key={entry.eventId}>
                  <TableCell className="pl-4 font-medium">{entry.collectionId}</TableCell>
                  <TableCell className="text-muted-foreground max-w-0">
                    <span className="block truncate font-mono text-xs">{String(entry.key)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline">{entry.reason}</Badge>
                      <span className="text-muted-foreground line-clamp-2 text-xs">
                        {entry.message}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatEventDate(entry.failedAt)}
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void retryOne(entry.eventId)}
                      >
                        {busyId === entry.eventId ? (
                          <Spinner className="size-3.5" />
                        ) : (
                          <RotateCcw className="size-3.5" />
                        )}
                        Retry
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => void discardOne(entry.eventId)}
                      >
                        <Trash2 className="size-3.5" />
                        Discard
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {showPager ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            Page {pagination.page}
            {pagination.hasMore ? "+" : ""} · {items.length} on this page
          </p>
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  className={!canPrevious ? "pointer-events-none opacity-50" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    if (canPrevious) setPage(currentPage - 1);
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  className={!canNext ? "pointer-events-none opacity-50" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    if (canNext) setPage(currentPage + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </div>
  );
}

function DeadLetterSkeleton() {
  return (
    <div className="bg-card rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Collection</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Failed</TableHead>
            <TableHead className="pr-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 4 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell className="pl-4">
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-40" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell className="pr-4">
                <Skeleton className="ml-auto h-8 w-32" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
