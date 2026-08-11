import { createFileRoute } from "@tanstack/react-router";
import { useSyncEnabled } from "event-sourced-collection/react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { APP_SETTINGS_ID, setSyncEnabled } from "@/data-access-layer/app-settings";
import { db, ensureDb } from "@/data-access-layer/collections";

export const Route = createFileRoute("/_dashboard/settings/")({
  component: SettingsPage,
  ssr: false,
});

function SettingsPage() {
  const syncEnabled = useSyncEnabled({
    settingsId: APP_SETTINGS_ID,
    ensureDb,
  });
  const [saving, setSaving] = useState(false);
  const [pruning, setPruning] = useState(false);

  const handleSyncToggle = (checked: boolean) => {
    setSaving(true);
    void setSyncEnabled(checked).finally(() => {
      setSaving(false);
    });
  };

  const handlePrune = () => {
    setPruning(true);
    void db
      .pruneSyncedEvents({ keepLast: 50 })
      .then((result) => {
        toast.success("Pruned synced events", {
          description: `Removed ${result.outbox} outbox and ${result.inbox} inbox row(s).`,
        });
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Prune failed");
      })
      .finally(() => {
        setPruning(false);
      });
  };

  return (
    <section className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2 text-sm">App preferences and sync behavior.</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-1">
            <Label htmlFor="sync-enabled">Background sync</Label>
            <p className="text-muted-foreground text-sm">
              Push local changes and pull remote events. Turn off to stay offline-only.
            </p>
          </div>
          <Switch
            id="sync-enabled"
            checked={syncEnabled}
            disabled={saving}
            onCheckedChange={handleSyncToggle}
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-1">
            <Label>Prune synced events</Label>
            <p className="text-muted-foreground text-sm">
              Drop confirmed outbox and applied inbox rows while keeping the pull cursor in{" "}
              <code className="text-xs">syncmeta</code>. Keeps the newest 50 per log.
            </p>
          </div>
          <Button type="button" variant="outline" disabled={pruning} onClick={handlePrune}>
            {pruning ? <Spinner className="size-4" /> : null}
            Prune
          </Button>
        </div>
      </div>
    </section>
  );
}
