import { useEffect, useState } from "react";

import type { DbWithSettings } from "./settings-collection";

export type UseSyncEnabledOptions = {
  /** When false, skips reading settings and returns `true`. */
  enabled?: boolean;
  settingsId: string;
  ensureDb: () => Promise<DbWithSettings>;
};

/**
 * Live-reads `settings.syncEnabled` for the given settings row id.
 */
export function useSyncEnabled({
  enabled = true,
  settingsId,
  ensureDb,
}: UseSyncEnabledOptions): boolean {
  const [syncEnabled, setSyncEnabled] = useState(true);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let subscription: { unsubscribe: () => void } | undefined;

    void ensureDb().then((database) => {
      if (cancelled) {
        return;
      }

      const read = () => {
        const setting = database.collections.settings.get(settingsId);
        setSyncEnabled(setting?.syncEnabled ?? true);
      };

      read();
      subscription = database.collections.settings.subscribeChanges(read);
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [enabled, ensureDb, settingsId]);

  if (!enabled) {
    return true;
  }

  return syncEnabled;
}
