import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function getTanstackQueryContext() {
  const queryClient = new QueryClient();
  return {
    queryClient,
  };
}

export function TanstackQueryProvider({
  children,
  queryClient,
}: {
  children: React.ReactNode;
  queryClient: QueryClient;
}) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
