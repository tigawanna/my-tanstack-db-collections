import { useEffect, useState } from "react";

import { ensureAppSettings } from "@/data-access-layer/app-settings";
import { useEventSourcedSync } from "@/hooks/common/use-event-sourced-sync";
import { useSyncEnabled } from "@/hooks/common/use-sync-enabled";

export function EventSourcedSyncRunner() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    void ensureAppSettings().then(() => {
      setDbReady(true);
    });
  }, []);

  const syncEnabled = useSyncEnabled(dbReady);
  useEventSourcedSync(dbReady && syncEnabled);

  return null;
}
