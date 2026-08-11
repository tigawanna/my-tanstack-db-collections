import { useState } from "react";

export function getPaginationMeta(page: number, totalItems: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * pageSize;
  const start = totalItems === 0 ? 0 : offset + 1;
  const end = Math.min(offset + pageSize, totalItems);

  return {
    page: safePage,
    totalPages,
    offset,
    pageSize,
    range: { start, end },
    canPrevious: safePage > 1,
    canNext: safePage < totalPages,
  };
}

export function usePagination(totalItems: number, pageSize: number) {
  const [page, setPage] = useState(1);
  const meta = getPaginationMeta(page, totalItems, pageSize);

  return {
    ...meta,
    setPage,
    resetPage: () => setPage(1),
  };
}
