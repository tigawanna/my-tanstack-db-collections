import ResponsivePagination from "react-responsive-pagination";
import "@/components/pagination/pagination.css";

interface ListPaginationProps {
  /** 1-based current page. */
  page: number;
  /** Total number of pages. Hidden when ≤ 1. */
  totalPages: number;
  /** Called when the user selects another page. */
  onPageChange: (page: number) => void;
  className?: string;
  "data-test"?: string;
}

/**
 * Centered page-number control for offset/limit list UIs.
 *
 * Renders nothing when there is only one page (or none).
 */
export function BetterReactResponsivePagination({
  page,
  totalPages,
  onPageChange,
  className,
  "data-test": dataTest = "list-pagination",
}: ListPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div
      className={className ?? "flex w-full items-center justify-center pt-2"}
      data-test={dataTest}
    >
      <ResponsivePagination
        current={Math.min(Math.max(1, page), totalPages)}
        total={totalPages}
        onPageChange={(nextPage) => {
          onPageChange(nextPage);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}
