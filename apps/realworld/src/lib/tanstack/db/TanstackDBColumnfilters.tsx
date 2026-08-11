import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Collection } from "@tanstack/db";
import { type NavigateOptions } from "@tanstack/react-router";
import { ArrowDownAZ, ArrowUpZA, SlidersHorizontal } from "lucide-react";
import { useCallback, useTransition } from "react";
import { CollectionColumns, ColumnConfig } from "./sortable-columns";

/**
 * Props for TanStack DB Column Filters components.
 *
 * These components provide a UI for sorting TanStack DB collections by different columns.
 * They integrate with TanStack Router's search params to persist sort preferences in the URL.
 *
 * @template TCollection - The TanStack DB Collection type (used for type inference)
 * @template TColumns - The column names from the collection (auto-inferred from TCollection)
 */
interface TanstackDBColumnFiltersProps<
  TCollection extends Collection<any, any>,
  TColumns extends CollectionColumns<TCollection> = CollectionColumns<TCollection>,
> {
  /**
   * The TanStack DB collection instance.
   *
   * This is passed mainly for TypeScript type inference - it allows TypeScript to know what
   * columns are available in your schema. At runtime, the component doesn't directly query
   * the collection; instead it uses the search params and navigate function to update sorting.
   *
   * @example
   * ```tsx
   * import { organizationsCollection } from "@/data-access-layer/collections/admin/organizations";
   *
   * <TanstackDBColumnFilters
   *   collection={organizationsCollection}
   *   // ... other props
   * />
   * ```
   */
  collection: TCollection;

  /**
   * Array of columns that users can sort by, with human-readable labels.
   *
   * This defines which columns appear in the sort dropdown menu and what labels to show.
   * Use the `createSortableColumns` helper to get type-safe column configuration.
   *
   * @example
   * ```tsx
   * const sortableColumns = createSortableColumns(organizationsCollection, [
   *   { value: "name", label: "Organization Name" },
   *   { value: "createdAt", label: "Created At" },
   *   { value: "slug", label: "URL Slug" },
   * ]);
   *
   * <TanstackDBColumnFilters
   *   sortableColumns={sortableColumns}
   *   // ... other props
   * />
   * ```
   */
  sortableColumns: Array<ColumnConfig<TColumns>>;

  /**
   * Current route search parameters.
   *
   * This object should contain at least `sortBy` and `sortDirection` keys from your route's
   * validated search params. The component reads these to know what's currently selected,
   * and updates them when the user changes the sort settings.
   *
   * The object can contain other keys - they won't be modified by the component.
   *
   * @example
   * ```tsx
   * // In your route file:
   * export const Route = createFileRoute("/dashboard/organizations/")({
   *   validateSearch: z.object({
   *     sortBy: z.string().optional(),
   *     sortDirection: z.enum(["asc", "desc"]).optional(),
   *     sq: z.string().optional(), // search query
   *     offset: z.number().optional(),
   *   }),
   * });
   *
   * // In your component:
   * const search = useSearch({ from: "/dashboard/organizations/" });
   * <TanstackDBColumnFilters search={search} />
   * ```
   */
  search: {
    sortBy?: string;
    sortDirection?: "asc" | "desc";
    [key: string]: unknown;
  };

  /**
   * TanStack Router navigation function.
   *
   * Called when the user changes the sort column or direction. Updates the route's search
   * params, which triggers a URL update and re-fetch of your data with the new sort order.
   * Uses transitions to prevent UI jank during the navigation.
   *
   * @example
   * ```tsx
   * const navigate = useNavigate({ from: "/dashboard/organizations/" });
   * <TanstackDBColumnFilters navigate={navigate} />
   * ```
   */
  navigate: (opts: NavigateOptions<any>) => void;

  /**
   * Default sort column to use if none is specified in the URL.
   *
   * If not provided, defaults to the first column in `sortableColumns`. This is useful
   * for setting a sensible starting sort order (e.g., "createdAt" in descending order).
   *
   * @default First column in sortableColumns
   *
   * @example
   * ```tsx
   * <TanstackDBColumnFilters
   *   defaultSortBy="createdAt" // Start sorted by creation date
   *   defaultSortDirection="desc" // Newest first
   *   // ... other props
   * />
   * ```
   */
  defaultSortBy?: TColumns;

  /**
   * Default sort direction (ascending or descending).
   *
   * If not provided, defaults to "desc" (descending order). Combined with `defaultSortBy`
   * to provide the initial sort order when no sort preference is in the URL.
   *
   * @default "desc"
   */
  defaultSortDirection?: "asc" | "desc";
}

/**
 * A popover-based sorting UI component for TanStack DB collections.
 *
 * This component provides a dropdown menu inside a popover for selecting which column to sort by,
 * plus a button to toggle between ascending and descending order. It's best for detailed/admin
 * interfaces where you have space for an extra button.
 *
 * How it works:
 * 1. User clicks the "Sort" button to open a popover
 * 2. A dropdown shows available columns (from sortableColumns)
 * 3. Selecting a column updates the URL search params via navigate()
 * 4. A toggle button changes between ascending/descending
 * 5. URL updates trigger data re-fetch with new sort order applied
 *
 * The component reads the current sort choice from the `search` object and updates it when
 * the user makes a change. All state is stored in the URL, not in component state.
 *
 * @template TCollection - The TanStack DB Collection type (for type inference)
 * @template TColumns - Available column names (auto-inferred from collection)
 *
 * @example
 * ```tsx
 * import { useNavigate, useSearch } from "@tanstack/react-router";
 * import { TanstackDBColumnFilters } from "@/lib/tanstack/db/TanstackDBColumnfilters";
 * import { organizationsCollection } from "@/data-access-layer/collections/organizations";
 * import { createSortableColumns } from "@/lib/tanstack/db/sortable-columns";
 *
 * // Step 1: Define your sortable columns (type-safe)
 * const sortableColumns = createSortableColumns(organizationsCollection, [
 *   { value: "name", label: "Organization Name" },
 *   { value: "createdAt", label: "Created At" },
 *   { value: "slug", label: "URL Slug" },
 * ]);
 *
 * // Step 2: Use the component in your page
 * function OrganizationsList() {
 *   const search = useSearch({ from: "/dashboard/admin/organizations/" });
 *   const navigate = useNavigate({ from: "/dashboard/admin/organizations/" });
 *
 *   return (
 *     <div className="flex gap-3 items-end">
 *       <SearchInput />
 *
 *       <TanstackDBColumnFilters
 *         collection={organizationsCollection}
 *         sortableColumns={sortableColumns}
 *         search={search}
 *         navigate={navigate}
 *         defaultSortBy="createdAt"
 *         defaultSortDirection="desc"
 *       />
 *     </div>
 *   );
 * }
 *
 * // Step 3: Apply the sort in your query
 * const query = useLiveQuery(
 *   (q) =>
 *     q
 *       .from({ orgs: organizationsCollection })
 *       .where(({ orgs }) => ilike(orgs.name, `%${search.sq}%`))
 *       .orderBy(
 *         ({ orgs }) => orgs[search.sortBy ?? "createdAt"],
 *         search.sortDirection ?? "desc"
 *       )
 *       .limit(limit)
 *       .offset(search.offset ?? 0),
 *   [search.sq, search.sortBy, search.sortDirection, limit]
 * );
 * ```
 */
export function TanstackDBColumnFilters<
  TCollection extends Collection<any, any>,
  TColumns extends CollectionColumns<TCollection> = CollectionColumns<TCollection>,
>({
  sortableColumns,
  search,
  navigate,
  defaultSortBy,
  defaultSortDirection = "desc",
}: TanstackDBColumnFiltersProps<TCollection, TColumns>) {
  // Use React's transition hook to prevent UI jank during navigation
  const [, startTransition] = useTransition();

  // Determine what's currently selected, with fallbacks:
  // 1. Value from URL (search.sortBy) if present
  // 2. defaultSortBy if provided
  // 3. First sortable column as final fallback
  const currentSortBy = (search.sortBy as TColumns) ?? defaultSortBy ?? sortableColumns[0]?.value;

  // Current sort direction from URL, or use default (usually "desc")
  const currentSortDirection = search.sortDirection ?? defaultSortDirection;

  // Helper function to update URL search params with new sort values
  // Preserves other search params (like search query) while updating sort-related ones
  const setSearch = useCallback(
    (patch: Partial<Record<string, unknown>>) => {
      startTransition(() => {
        navigate({
          search: (prev: Record<string, unknown>) => ({
            ...prev, // Keep existing params (e.g., search query)
            ...patch, // Override with new sort params
          }),
          replace: true, // Replace current history entry instead of pushing new one
        });
      });
    },
    [navigate],
  );

  // Called when user selects a different column from the dropdown
  // Resets offset to 0 to start from the first page with new sort order
  const handleSortByChange = (value: string) => {
    setSearch({ sortBy: value, offset: 0 });
  };

  // Called when user clicks the direction toggle button
  // Flips between ascending and descending order
  // Also resets offset to 0 to start from the first page
  const handleSortDirectionToggle = () => {
    setSearch({
      sortDirection: currentSortDirection === "asc" ? "desc" : "asc",
      offset: 0, // Reset pagination when sort changes
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* Main button that opens the sort menu - icon only on mobile, icon + text on desktop */}
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Sort</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        {/* Sort settings panel */}
        <div className="space-y-4">
          {/* Section 1: Column selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sort by</label>
            <Select value={currentSortBy} onValueChange={handleSortByChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {sortableColumns.map((column) => (
                  <SelectItem key={column.value} value={column.value}>
                    {column.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section 2: Direction toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Direction</label>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleSortDirectionToggle}
            >
              {currentSortDirection === "asc" ? (
                <>
                  <ArrowDownAZ className="h-4 w-4" />
                  Ascending
                </>
              ) : (
                <>
                  <ArrowUpZA className="h-4 w-4" />
                  Descending
                </>
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Inline sort UI variant - more compact for toolbars and tight spaces.
 *
 * This component provides the same sorting functionality as TanstackDBColumnFilters but
 * in a more compact form: a select dropdown for choosing the column + a small icon button
 * to toggle direction. Use this when space is limited, such as in data table toolbars.
 *
 * How it works:
 * 1. User selects a column from the dropdown (immediately updates URL)
 * 2. User clicks the icon button to toggle direction
 * 3. URL changes trigger data re-fetch with new sort order
 *
 * @template TCollection - The TanStack DB Collection type (for type inference)
 * @template TColumns - Available column names (auto-inferred from collection)
 *
 * @example
 * ```tsx
 * // Compact variant for a table toolbar
 * <div className="flex items-center gap-2 mb-4">
 *   <SearchInput placeholder="Filter..." />
 *   <TanstackDBSortSelect
 *     collection={organizationsCollection}
 *     sortableColumns={sortableColumns}
 *     search={search}
 *     navigate={navigate}
 *     defaultSortBy="createdAt"
 *   />
 * </div>
 * ```
 */
export function TanstackDBSortSelect<
  TCollection extends Collection<any, any>,
  TColumns extends CollectionColumns<TCollection> = CollectionColumns<TCollection>,
>({
  sortableColumns,
  search,
  navigate,
  defaultSortBy,
  defaultSortDirection = "desc",
}: TanstackDBColumnFiltersProps<TCollection, TColumns>) {
  // Use React's transition hook to prevent UI jank during navigation
  const [, startTransition] = useTransition();

  // Determine what's currently selected, with fallbacks
  const currentSortBy = (search.sortBy as TColumns) ?? defaultSortBy ?? sortableColumns[0]?.value;
  const currentSortDirection = search.sortDirection ?? defaultSortDirection;

  // Helper function to update URL search params with new sort values
  const setSearch = useCallback(
    (patch: Partial<Record<string, unknown>>) => {
      startTransition(() => {
        navigate({
          search: (prev: Record<string, unknown>) => ({
            ...prev, // Keep existing params
            ...patch, // Override with new sort params
          }),
          replace: true, // Replace history entry instead of pushing
        });
      });
    },
    [navigate],
  );

  return (
    // Compact flex layout: dropdown on left, direction toggle button on right
    <div className="flex items-center gap-1">
      {/* Column selector dropdown */}
      <Select
        value={currentSortBy}
        onValueChange={(value) => setSearch({ sortBy: value, offset: 0 })}
      >
        <SelectTrigger className="h-9 w-35">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {sortableColumns.map((column) => (
            <SelectItem key={column.value} value={column.value}>
              {column.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Direction toggle button - shows current direction via icon */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={() =>
          setSearch({
            sortDirection: currentSortDirection === "asc" ? "desc" : "asc",
            offset: 0,
          })
        }
        title={`Sort ${currentSortDirection === "asc" ? "descending" : "ascending"}`}
      >
        {currentSortDirection === "asc" ? (
          <ArrowDownAZ className="h-4 w-4" /> // Ascending: A→Z
        ) : (
          <ArrowUpZA className="h-4 w-4" /> // Descending: Z→A
        )}
      </Button>
    </div>
  );
}
