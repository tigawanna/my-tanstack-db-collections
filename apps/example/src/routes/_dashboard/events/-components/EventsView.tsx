import { Activity, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useManualSync } from "event-sourced-collection/react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_SETTINGS_ID } from "@/data-access-layer/app-settings";
import { ensureDb } from "@/data-access-layer/collections";
import { manualSyncEvents } from "@/data-access-layer/sync-events";

import { DeadLetterList } from "./DeadLetterList";
import { InboxList } from "./InboxList";
import { OutboxList } from "./OutboxList";
import { SyncStatusStrip } from "./SyncStatusStrip";

type EventTab = "outbox" | "inbox" | "deadletter";

const EVENT_TAB_HINTS: Record<EventTab, string> = {
  outbox: "Local changes waiting to be pushed to the server.",
  inbox: "Remote changes received from the server to be applied locally.",
  deadletter: "Permanently rejected events. Retry to requeue, or discard to drop them.",
};

export function EventsView() {
  const [tab, setTab] = useState<EventTab>("outbox");
  const { syncEnabled, syncing, syncMessage, runSync } = useManualSync({
    settingsId: APP_SETTINGS_ID,
    ensureDb,
    sync: manualSyncEvents,
  });

  return (
    <div className="bg-muted/30 mx-auto flex min-h-full w-full max-w-5xl flex-col gap-6 rounded-xl p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground text-sm">
            Inspect the local outbox, inbox, and dead-letter queue. Status below uses{" "}
            <code className="text-xs">subscribeSyncStatus</code>.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => void runSync()}
          disabled={syncing || !syncEnabled}
          className="shrink-0"
        >
          {syncing ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />}
          Sync now
        </Button>
      </div>

      {syncMessage ? <p className="text-muted-foreground -mt-3 text-sm">{syncMessage}</p> : null}

      <SyncStatusStrip />

      <Tabs value={tab} onValueChange={(value) => setTab(value as EventTab)}>
        <div className="flex flex-col gap-2">
          <TabsList>
            <TabsTrigger value="outbox">Outbox</TabsTrigger>
            <TabsTrigger value="inbox">Inbox</TabsTrigger>
            <TabsTrigger value="deadletter">Dead letter</TabsTrigger>
          </TabsList>
          <p className="text-muted-foreground text-sm">{EVENT_TAB_HINTS[tab]}</p>
        </div>
      </Tabs>

      <Activity mode={tab === "outbox" ? "visible" : "hidden"}>
        <OutboxList />
      </Activity>
      <Activity mode={tab === "inbox" ? "visible" : "hidden"}>
        <InboxList />
      </Activity>
      <Activity mode={tab === "deadletter" ? "visible" : "hidden"}>
        <DeadLetterList />
      </Activity>
    </div>
  );
}
