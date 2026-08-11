import { Button } from "@/components/ui/button";
import { useLiveInfiniteQuery } from "@tanstack/react-db";
import { useState } from "react";
import ResponsivePagination from "react-responsive-pagination";
import { MoviesTable } from "../../-components/movies/MoviesTable";
import { paginatedMoviesCollection } from "./collection";

export function ListQueryDrivenMoviesInfinite() {
  const { isLoading, fetchNextPage, pages, pageParams, hasNextPage } = useLiveInfiniteQuery(
    (q) =>
      q.from({ movies: paginatedMoviesCollection }).orderBy(({ movies }) => movies.rating, "desc"),
    {
      initialPageParam: 0,
      pageSize: 200,
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length === 200 ? allPages.length : undefined,
    },
  );

  const latestPage = pageParams.at(-1);
  const [currentPage, setCurrentPage] = useState(latestPage ?? 0);
  const currentPageData = pages[currentPage];

  async function handleLoadMore() {
    setCurrentPage((prev) => (latestPage ?? prev) + 1);
    fetchNextPage();
  }

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div className="w-full h-full flex justify-end items-center gap-4">
        <div className="max-w-[90%] w-full ">
          <ResponsivePagination
            current={currentPage}
            total={latestPage ?? 1}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
        <Button onClick={handleLoadMore} disabled={!hasNextPage}>
          Load more
        </Button>
      </div>
      <div className="w-full h-full flex flex-col gap-4">
        <MoviesTable data={currentPageData} isLoading={isLoading} />
      </div>
    </div>
  );
}
