import { TRouteID } from "@/lib/tanstack/router/router-types";
import { getRouteApi } from "@tanstack/react-router";
import { BetterReactResponsivePagination } from "./BetterReactResponsivePagination";

interface TSRListPaginationProps {
  routeID: TRouteID;
  totalPages: number;
  "data-test"?: string;
}

/**
 * Route-aware list pagination. Reads `page` from the route search and navigates
 * while preserving other search params (`q`, sort, filters).
 */
export function TSRListPagination({
  routeID,
  totalPages,
  "data-test": dataTest = "backstage-list-pagination",
}: TSRListPaginationProps) {
  const routeApi = getRouteApi(routeID);
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  const currentPage = "page" in search ? (search.page ?? 1) : 1;

  function setPage(page: number) {
    void navigate({
      search: (prev) => ({
        ...prev,
        page: page <= 1 ? undefined : page,
      }),
      replace: true,
    });
  }

  if (totalPages <= 1) return null;

  return (
    <div className="flex w-full items-center justify-center">
      <BetterReactResponsivePagination
        page={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
        data-test={dataTest}
      />
    </div>
  );
}
