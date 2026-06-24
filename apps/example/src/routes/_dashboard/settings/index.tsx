import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { setSyncEnabled } from "@/data-access-layer/app-settings";
import { useSyncEnabled } from "@/hooks/common/use-sync-enabled";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_dashboard/settings/")({
  component: SettingsPage,
  ssr: false,
});

function SettingsPage() {
  const syncEnabled = useSyncEnabled(true);
  const [saving, setSaving] = useState(false);

  const handleSyncToggle = (checked: boolean) => {
    setSaving(true);
    void setSyncEnabled(checked).finally(() => {
      setSaving(false);
    });
  };

  return (
    <section className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2 text-sm">App preferences and sync behavior.</p>
      </div>

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
    </section>
  );
}
