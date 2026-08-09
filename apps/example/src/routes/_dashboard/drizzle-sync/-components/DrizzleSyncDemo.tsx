import { useState } from "react";
import { AlertTriangle, Database, Layers, RefreshCw } from "lucide-react";
import { INBOX_REQUIRED_KEYS, OUTBOX_REQUIRED_KEYS } from "drizzle-sync-engine";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  createDemoNoteInput,
  DEMO_DEVICE_ID,
  drizzleSyncEngine,
  type DrizzleSyncInboxRow,
  type DrizzleSyncOutboxRow,
} from "@/data-access-layer/drizzle-sync";

const OUTBOX_EXTRA_KEYS: Array<keyof DrizzleSyncOutboxRow> = ["deviceId", "priority"];
const INBOX_EXTRA_KEYS: Array<keyof DrizzleSyncInboxRow> = ["receivedAt"];

export function DrizzleSyncDemo() {
  const [syncEnabled, setSyncEnabled] = useState(() => drizzleSyncEngine.getSyncEnabled());
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const collectionIds = Object.keys(drizzleSyncEngine.collections);

  function handleSyncToggle(checked: boolean) {
    drizzleSyncEngine.setSyncEnabled(checked);
    setSyncEnabled(drizzleSyncEngine.getSyncEnabled());
    setActionMessage(checked ? "Sync enabled." : "Sync disabled.");
    setActionError(null);
  }

  async function handleTryMutate() {
    setActionMessage(null);
    setActionError(null);
    const note = createDemoNoteInput("Demo note");
    try {
      await drizzleSyncEngine.mutate.insert("notes", note);
      setActionMessage(`Inserted note ${note.id}`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleTrySync() {
    setActionMessage(null);
    setActionError(null);
    try {
      const result = await drizzleSyncEngine.sync();
      setActionMessage(`Synced — pushed ${result.pushed}, pulled ${result.pulled}`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="bg-muted/30 mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 rounded-xl p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Drizzle sync engine</h1>
        <p className="text-muted-foreground text-sm">
          Usage demo for <code className="text-foreground">drizzle-sync-engine</code> — SQL-native
          inbox/outbox with extensible columns. Separate from the TanStack DB Events route.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <p>
          Package is scaffolded: schema builders and typed hooks work; <code>mutate</code> /{" "}
          <code>sync</code> apply path is not implemented yet (buttons below will surface that).
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
        <div className="space-y-1">
          <Label htmlFor="drizzle-sync-enabled">Sync enabled</Label>
          <p className="text-muted-foreground text-sm">
            Mirrors <code>engine.setSyncEnabled()</code> — same idea as the TanStack settings
            toggle.
          </p>
        </div>
        <Switch
          id="drizzle-sync-enabled"
          checked={syncEnabled}
          onCheckedChange={handleSyncToggle}
        />
      </div>

      <section className="rounded-lg border p-4">
        <div className="mb-3 flex items-center gap-2 font-medium">
          <Layers className="size-4" />
          Collections
        </div>
        <ul className="text-muted-foreground list-inside list-disc text-sm">
          {collectionIds.map((id) => (
            <li key={id}>
              <code className="text-foreground">{id}</code>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-3 text-sm">
          Demo device id for <code>onAppendOutbox</code>:{" "}
          <code className="text-foreground">{DEMO_DEVICE_ID}</code>
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <ColumnCard
          title="Outbox columns"
          required={[...OUTBOX_REQUIRED_KEYS]}
          extras={OUTBOX_EXTRA_KEYS}
        />
        <ColumnCard
          title="Inbox columns"
          required={[...INBOX_REQUIRED_KEYS]}
          extras={INBOX_EXTRA_KEYS}
        />
      </section>

      <section className="rounded-lg border p-4">
        <div className="mb-3 flex items-center gap-2 font-medium">
          <Database className="size-4" />
          Try the API
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => void handleTryMutate()}>
            mutate.insert(notes)
          </Button>
          <Button type="button" onClick={() => void handleTrySync()} disabled={!syncEnabled}>
            <RefreshCw className="size-4" />
            engine.sync()
          </Button>
        </div>
        {actionMessage ? (
          <p className="text-muted-foreground mt-3 text-sm">{actionMessage}</p>
        ) : null}
        {actionError ? <p className="mt-3 text-sm text-destructive">{actionError}</p> : null}
      </section>

      <section className="rounded-lg border p-4">
        <p className="mb-2 text-sm font-medium">Where to look</p>
        <ul className="text-muted-foreground list-inside list-disc text-sm">
          <li>
            <code className="text-foreground">src/data-access-layer/drizzle-sync/schema.ts</code>
          </li>
          <li>
            <code className="text-foreground">src/data-access-layer/drizzle-sync/engine.ts</code>
          </li>
        </ul>
      </section>
    </div>
  );
}

function ColumnCard({
  title,
  required,
  extras,
}: {
  title: string;
  required: string[];
  extras: string[];
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="mb-2 text-sm font-medium">{title}</p>
      <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wide">Required</p>
      <p className="mb-3 font-mono text-xs leading-relaxed">{required.join(", ")}</p>
      <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wide">Extras</p>
      <p className="font-mono text-xs leading-relaxed">{extras.join(", ")}</p>
    </div>
  );
}
