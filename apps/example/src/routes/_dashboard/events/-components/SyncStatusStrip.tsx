import { useEffect, useState } from "react";
import type { SyncStatus } from "event-sourced-collection";

import { Badge } from "@/components/ui/badge";
import { db } from "@/data-access-layer/collections";

import { formatEventDate } from "./event-view";

/**
 * Live strip driven by `db.subscribeSyncStatus` — pending, failed, dead-letter,
 * pull cursor, and last error.
 */
export function SyncStatusStrip() {
  const [status, setStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    return db.subscribeSyncStatus(setStatus);
  }, []);

  if (!status) return null;

  return (
    <div className="bg-card flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={status.isSyncing ? "default" : "secondary"}>
          {status.isSyncing ? "Syncing" : status.isSynced ? "Synced" : "Pending"}
        </Badge>
        <span className="text-muted-foreground text-sm">
          {status.pendingCount} pending · {status.failedCount} failed · {status.deadLetterCount}{" "}
          dead letter
        </span>
      </div>
      <div className="text-muted-foreground flex flex-col gap-0.5 text-xs sm:items-end">
        <span>
          Cursor {status.pullCursor}
          {status.backendId ? ` · backend ${status.backendId.slice(0, 8)}…` : ""}
        </span>
        <span>
          {status.lastSyncAt
            ? `Last sync ${formatEventDate(status.lastSyncAt)}`
            : "No successful sync yet"}
        </span>
        {status.lastError ? (
          <span className="text-destructive max-w-md truncate" title={status.lastError}>
            {status.lastError}
          </span>
        ) : null}
      </div>
    </div>
  );
}
