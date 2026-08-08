import { useSyncEnabled } from "event-sourced-collection/react";
import { useEffect, useState } from "react";

import { APP_SETTINGS_ID, ensureAppSettings } from "@/data-access-layer/app-settings";
import { ensureDb } from "@/data-access-layer/collections";
import { useEventSourcedSync } from "@/hooks/common/use-event-sourced-sync";

export function EventSourcedSyncRunner() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    void ensureAppSettings().then(() => {
      setDbReady(true);
    });
  }, []);

  const syncEnabled = useSyncEnabled({
    enabled: dbReady,
    settingsId: APP_SETTINGS_ID,
    ensureDb,
  });
  useEventSourcedSync(dbReady && syncEnabled);

  return null;
}
