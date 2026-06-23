import { useEffect, useState } from "react";

import { ensureDb } from "@/data-access-layer/collections";
import { useEventSourcedSync } from "@/hooks/common/use-event-sourced-sync";

export function EventSourcedSyncRunner() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    void ensureDb().then(() => {
      setEnabled(true);
    });
  }, []);

  useEventSourcedSync(enabled);

  return null;
}
