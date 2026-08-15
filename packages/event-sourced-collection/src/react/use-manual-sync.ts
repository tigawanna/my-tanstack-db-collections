import { useCallback, useState } from "react";

import type { ManualSyncResult } from "../types";
import { formatManualSyncMessage } from "./format-manual-sync-message";
import type { DbWithSettings } from "./settings-collection";
import { useSyncEnabled } from "./use-sync-enabled";

export type UseManualSyncOptions = {
  /** When false, skips reading settings and treats sync as enabled. */
  enabled?: boolean;
  settingsId: string;
  ensureDb: () => Promise<DbWithSettings>;
  /** Typically `() => ensureDb().then((db) => db.manualSync())`. */
  sync: () => Promise<ManualSyncResult>;
  disabledMessage?: string;
};

export type UseManualSyncReturn = {
  syncEnabled: boolean;
  syncing: boolean;
  syncMessage: string | null;
  /**
   * Runs the sync callback, updates `syncing` / `syncMessage`, and returns the
   * raw result on success (including results that contain `errors`).
   * Returns `undefined` when sync is disabled or the callback throws.
   */
  runSync: () => Promise<ManualSyncResult | undefined>;
};

const DEFAULT_DISABLED_MESSAGE = "Sync is disabled in Settings.";

/**
 * Encapsulates settings-gated manual sync UI state so callers don't format
 * `ManualSyncResult` themselves.
 */
export function useManualSync({
  enabled = true,
  settingsId,
  ensureDb,
  sync,
  disabledMessage = DEFAULT_DISABLED_MESSAGE,
}: UseManualSyncOptions): UseManualSyncReturn {
  const syncEnabled = useSyncEnabled({ enabled, settingsId, ensureDb });
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const runSync = useCallback(async (): Promise<ManualSyncResult | undefined> => {
    if (!syncEnabled) {
      setSyncMessage(disabledMessage);
      return undefined;
    }

    setSyncing(true);
    setSyncMessage(null);

    try {
      const result = await sync();
      setSyncMessage(formatManualSyncMessage(result));
      return result;
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Sync failed");
      return undefined;
    } finally {
      setSyncing(false);
    }
  }, [disabledMessage, sync, syncEnabled]);

  return {
    syncEnabled,
    syncing,
    syncMessage,
    runSync,
  };
}
