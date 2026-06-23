import { useQuery } from "@tanstack/react-query";

import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { manualSyncEvents } from "@/data-access-layer/sync-events";

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

export const eventSourcedSyncQueryKey: [typeof queryKeyPrefixes.sync] = [queryKeyPrefixes.sync];

export function useEventSourcedSync(enabled: boolean) {
  return useQuery({
    queryKey: eventSourcedSyncQueryKey,
    queryFn: () => manualSyncEvents(),
    enabled,
    refetchInterval: SYNC_INTERVAL_MS,
    refetchIntervalInBackground: true,
    retry: 1,
  });
}
