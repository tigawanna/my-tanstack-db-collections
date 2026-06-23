import { useLiveQuery } from "@tanstack/react-db";

import { db } from "@/data-access-layer/collections";

import { EventsTable } from "./EventsTable";
import { toEventView } from "./event-view";

export function InboxList() {
  const { data, isLoading } = useLiveQuery((query) =>
    query.from({ event: db.collections.inbox }).orderBy(({ event }) => event.globalSeq, "desc"),
  );

  return (
    <EventsTable
      rows={(data ?? []).map(toEventView)}
      isLoading={isLoading}
      syncedLabel="Applied"
      pendingLabel="Pending"
      emptyTitle="Inbox is empty"
      emptyDescription="Events received from the server will appear here once you sync."
      onDelete={async (eventId) => {
        await db.collections.inbox.delete(eventId).isPersisted.promise;
      }}
    />
  );
}
