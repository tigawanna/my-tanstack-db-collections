import { useLiveQuery } from "@tanstack/react-db";

import { db } from "@/data-access-layer/collections";

import { EventsTable } from "./EventsTable";
import { toEventView } from "./event-view";

export function OutboxList() {
  const { data, isLoading } = useLiveQuery((query) =>
    query.from({ event: db.collections.outbox }).orderBy(({ event }) => event.localSeq, "desc"),
  );

  return (
    <EventsTable
      rows={(data ?? []).map(toEventView)}
      isLoading={isLoading}
      syncedLabel="Pushed"
      pendingLabel="Pending"
      emptyTitle="Outbox is empty"
      emptyDescription="Local mutations waiting to be pushed to the server will appear here."
      onDelete={async (eventId) => {
        await db.collections.outbox.delete(eventId).isPersisted.promise;
      }}
    />
  );
}
