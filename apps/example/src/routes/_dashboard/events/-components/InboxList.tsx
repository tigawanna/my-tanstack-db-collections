import { useState } from "react";
import type { Collection } from "@tanstack/db";
import { useLiveInfiniteQuery } from "@tanstack/react-db";
import type { InboxEntry } from "event-sourced-collection";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { db } from "@/data-access-layer/collections";

import { EventsTable } from "./EventsTable";
import { toEventView } from "./event-view";

const INBOX_PAGE_SIZE = 5;

export function InboxList() {
  const [pageIndex, setPageIndex] = useState(0);

  const { pages, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useLiveInfiniteQuery(
    (query) =>
      query
        .from({ event: db.collections.inbox as unknown as Collection<InboxEntry> })
        .orderBy(({ event }) => event.globalSeq, "desc"),
    {
      pageSize: INBOX_PAGE_SIZE,
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length === INBOX_PAGE_SIZE ? allPages.length : undefined,
    },
  );

  const safePageIndex = Math.min(pageIndex, Math.max(0, pages.length - 1));
  const items = pages[safePageIndex] ?? [];
  const currentPage = safePageIndex + 1;
  const canPrevious = safePageIndex > 0;
  const canNext = safePageIndex < pages.length - 1 || (hasNextPage && !isFetchingNextPage);
  const showPager = !isLoading && (items.length > 0 || safePageIndex > 0 || pages.length > 1);

  function goPrevious() {
    if (!canPrevious) return;
    setPageIndex((index) => Math.max(0, index - 1));
  }

  function goNext() {
    if (safePageIndex < pages.length - 1) {
      setPageIndex(safePageIndex + 1);
      return;
    }
    if (!hasNextPage || isFetchingNextPage) return;
    fetchNextPage();
    setPageIndex(safePageIndex + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <EventsTable
        rows={items.map(toEventView)}
        isLoading={isLoading}
        syncedLabel="Applied"
        pendingLabel="Pending"
        emptyTitle="Inbox is empty"
        emptyDescription="Events received from the server will appear here once you sync."
        onDelete={async (eventId) => {
          await db.collections.inbox.delete(eventId).isPersisted.promise;
        }}
      />

      {showPager ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            Page {currentPage}
            {hasNextPage || safePageIndex < pages.length - 1 ? "+" : ""} · {items.length} on this
            page
            {isFetchingNextPage ? " · loading…" : ""}
          </p>
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  className={!canPrevious ? "pointer-events-none opacity-50" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    goPrevious();
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  className={!canNext ? "pointer-events-none opacity-50" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    goNext();
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
