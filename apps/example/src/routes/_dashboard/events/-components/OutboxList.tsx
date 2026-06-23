import { useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { db } from "@/data-access-layer/collections";
import { manualSyncEvents } from "@/data-access-layer/sync-events";

import { EventsTable } from "./EventsTable";
import { toEventView } from "./event-view";

export function OutboxList() {
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const { data, isLoading } = useLiveQuery((query) =>
    query.from({ event: db.collections.outbox }).orderBy(({ event }) => event.localSeq, "desc"),
  );

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncMessage(null);

    try {
      const result = await manualSyncEvents();

      if (result.errors.length > 0) {
        setSyncMessage(`Sync failed: ${result.errors[0]?.message ?? "Unknown error"}`);
        return;
      }

      setSyncMessage(
        `Pushed ${result.pushed}, pulled ${result.pulled}, replayed ${result.replayed} inbox event(s).`,
      );
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          Push pending outbox events and replay inbox events into local collections.
        </p>
        <Button type="button" onClick={handleManualSync} disabled={syncing}>
          {syncing ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />}
          Sync now
        </Button>
      </div>

      {syncMessage ? <p className="text-muted-foreground text-sm">{syncMessage}</p> : null}

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
    </div>
  );
}
