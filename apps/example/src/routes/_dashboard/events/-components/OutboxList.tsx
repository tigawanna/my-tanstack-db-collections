import { useEffect, useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { db } from "@/data-access-layer/collections";
import {
  buildPaginatedResponseFromPeek,
  normalizePaginationParams,
} from "@/lib/tanstack/db/pagination";

import { EventsTable } from "./EventsTable";
import { toEventView } from "./event-view";

const OUTBOX_PAGE_SIZE = 5;

export function OutboxList() {
  const [page, setPage] = useState(1);
  const {
    page: currentPage,
    perPage,
    offset,
  } = normalizePaginationParams({ page }, { perPage: OUTBOX_PAGE_SIZE });

  const { data, isLoading } = useLiveQuery(
    (query) =>
      query
        .from({ event: db.collections.outbox })
        .orderBy(({ event }) => event.localSeq, "desc")
        .limit(perPage + 1)
        .offset(offset),
    [currentPage, perPage, offset],
  );

  const { items, pagination } = buildPaginatedResponseFromPeek({
    items: data ?? [],
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

  return (
    <div className="flex flex-col gap-4">
      <EventsTable
        rows={items.map(toEventView)}
        isLoading={isLoading}
        syncedLabel="Pushed"
        pendingLabel="Pending"
        emptyTitle="Outbox is empty"
        emptyDescription="Local mutations waiting to be pushed to the server will appear here."
        onDelete={async (eventId) => {
          await db.collections.outbox.delete(eventId).isPersisted.promise;
        }}
      />

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
