import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { getPaginationMeta } from "@/hooks/common/use-pagination";
import { fetchEvlogDates, fetchEvlogLogs } from "@/services/logs/logs.api";

const PAGE_SIZE = 20;

export function useEvlogLogsPage() {
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const datesQuery = useQuery({
    queryKey: [queryKeyPrefixes.logs, "dates"],
    queryFn: fetchEvlogDates,
    staleTime: 0,
  });

  const activeDate = selectedDate ?? datesQuery.data?.[0] ?? "";

  const logsQuery = useQuery({
    queryKey: [queryKeyPrefixes.logs, "events", activeDate, page, PAGE_SIZE],
    queryFn: () => fetchEvlogLogs({ date: activeDate, page, pageSize: PAGE_SIZE }),
    enabled: Boolean(activeDate),
    staleTime: 0,
  });

  const total = logsQuery.data?.total ?? 0;
  const pagination = getPaginationMeta(page, total, PAGE_SIZE);

  const selectDate = (date: string) => {
    setSelectedDate(date);
    setPage(1);
  };

  const refresh = async () => {
    await Promise.all([datesQuery.refetch(), logsQuery.refetch()]);
  };

  return {
    dates: datesQuery.data ?? [],
    activeDate,
    selectDate,
    events: logsQuery.data?.events ?? [],
    total,
    page: pagination.page,
    totalPages: pagination.totalPages,
    range: pagination.range,
    canPrevious: pagination.canPrevious,
    canNext: pagination.canNext,
    setPage,
    isLoading: datesQuery.isLoading || logsQuery.isLoading,
    isFetching: datesQuery.isFetching || logsQuery.isFetching,
    error: datesQuery.error ?? logsQuery.error,
    refresh,
  };
}
