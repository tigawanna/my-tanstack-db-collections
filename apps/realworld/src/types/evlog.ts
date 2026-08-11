export type EvlogLevel = "info" | "error" | "warn" | "debug";

export type EvlogSyncContext = {
  operation?: "push" | "pull";
  since?: number;
  returned?: number;
  hasMore?: boolean;
  cursor?: string;
  incomingCount?: number;
  confirmedCount?: number;
  collectionIds?: string[];
  rejected?: boolean;
  reason?: string;
};

export type EvlogWideEvent = {
  method?: string;
  path?: string;
  requestId?: string;
  status?: number;
  duration?: string;
  timestamp?: string;
  level?: EvlogLevel;
  service?: string;
  environment?: string;
  sync?: EvlogSyncContext;
  error?: {
    name?: string;
    message?: string;
    status?: number;
  };
};

export type EvlogLogsResponse = {
  date: string;
  files: string[];
  events: EvlogWideEvent[];
  total: number;
  page: number;
  pageSize: number;
};
