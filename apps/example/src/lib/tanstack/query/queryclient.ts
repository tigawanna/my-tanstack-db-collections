import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { environmentManager, MutationCache, QueryClient } from "@tanstack/react-query";

type QueryKey = [(typeof queryKeyPrefixes)[keyof typeof queryKeyPrefixes], ...(readonly unknown[])];

interface MyMeta extends Record<string, unknown> {
  invalidates?: [QueryKey[0], ...(readonly unknown[])][];
}

declare module "@tanstack/react-query" {
  interface Register {
    queryKey: QueryKey;
    mutationKey: QueryKey;
    mutationMeta: MyMeta;
  }
}

function makeQueryClient() {
  const queryClient = new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: async (_, __, ___, mutation) => {
        if (Array.isArray(mutation.meta?.invalidates)) {
          mutation.meta?.invalidates.forEach((queryKey) => {
            return queryClient.invalidateQueries({
              queryKey,
            });
          });
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 60,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
      },
    },
  });
  return queryClient;
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (environmentManager.isServer()) {
    // Server: always make a new query client (avoids cross-request cache leaks)
    return makeQueryClient();
  }
  // Browser: reuse one client for the tab (stable across Suspense remounts)
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
