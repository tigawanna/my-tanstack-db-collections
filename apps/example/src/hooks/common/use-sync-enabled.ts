import { eq } from "@tanstack/db";
import { useLiveQuery } from "@tanstack/react-db";

import { APP_SETTINGS_ID } from "@/data-access-layer/app-settings";
import { db } from "@/data-access-layer/collections";

export function useSyncEnabled(enabled: boolean) {
  const { data = [] } = useLiveQuery(
    (query) =>
      query
        .from({ setting: db.collections.settings })
        .where(({ setting }) => eq(setting.id, APP_SETTINGS_ID)),
    [enabled],
  );

  if (!enabled) {
    return true;
  }

  return data[0]?.syncEnabled ?? true;
}
