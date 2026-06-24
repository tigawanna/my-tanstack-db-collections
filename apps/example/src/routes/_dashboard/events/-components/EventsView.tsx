import { Activity, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { manualSyncEvents } from "@/data-access-layer/sync-events";
import { useSyncEnabled } from "@/hooks/common/use-sync-enabled";

import { InboxList } from "./InboxList";
import { OutboxList } from "./OutboxList";

type EventTab = "outbox" | "inbox";

export function EventsView() {
  const [tab, setTab] = useState<EventTab>("outbox");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const syncEnabled = useSyncEnabled(true);

  const handleManualSync = async () => {
    if (!syncEnabled) {
      setSyncMessage("Sync is disabled in Settings.");
      return;
    }

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
    <div className="bg-muted/30 mx-auto flex min-h-full w-full max-w-5xl flex-col gap-6 rounded-xl p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground text-sm">
            Inspect the local outbox and inbox event log.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleManualSync}
          disabled={syncing || !syncEnabled}
          className="shrink-0"
        >
          {syncing ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />}
          Sync now
        </Button>
      </div>

      {syncMessage ? <p className="text-muted-foreground -mt-3 text-sm">{syncMessage}</p> : null}

      <Tabs value={tab} onValueChange={(value) => setTab(value as EventTab)}>
        <TabsList>
          <TabsTrigger value="outbox">Outbox</TabsTrigger>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
        </TabsList>
      </Tabs>

      <Activity mode={tab === "outbox" ? "visible" : "hidden"}>
        <OutboxList />
      </Activity>
      <Activity mode={tab === "inbox" ? "visible" : "hidden"}>
        <InboxList />
      </Activity>
    </div>
  );
}
