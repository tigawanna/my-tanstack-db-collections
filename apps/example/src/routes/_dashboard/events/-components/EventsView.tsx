import { Activity, useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { InboxList } from "./InboxList";
import { OutboxList } from "./OutboxList";

type EventTab = "outbox" | "inbox";

export function EventsView() {
  const [tab, setTab] = useState<EventTab>("outbox");

  return (
    <div className="bg-muted/30 mx-auto flex min-h-full w-full max-w-5xl flex-col gap-6 rounded-xl p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Events</h1>
        <p className="text-muted-foreground text-sm">
          Inspect the local outbox and inbox event log.
        </p>
      </div>

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
