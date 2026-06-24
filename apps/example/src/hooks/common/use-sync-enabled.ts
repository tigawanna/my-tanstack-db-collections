import { useEffect, useState } from "react";

import { APP_SETTINGS_ID } from "@/data-access-layer/app-settings";
import { ensureDb } from "@/data-access-layer/collections";

export function useSyncEnabled(enabled: boolean) {
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
        const setting = database.collections.settings.get(APP_SETTINGS_ID);
        setSyncEnabled(setting?.syncEnabled ?? true);
      };

      read();
      subscription = database.collections.settings.subscribeChanges(read);
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [enabled]);

  if (!enabled) {
    return true;
  }

  return syncEnabled;
}
