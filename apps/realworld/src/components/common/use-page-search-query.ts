import { TRouteID } from "@/lib/tanstack/router/router-types";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const SEARCH_DEBOUNCE_MS = 2000;

/**
 * Debounced URL `q` search for a TanStack Router route id.
 *
 * Keeps a local input value in sync with the committed `q` search param and
 * resets `page` whenever the query commits or clears.
 *
 * @param routeID - File route id (e.g. `"/_backstage/backstage/journal"`).
 */
export function usePageSearchQuery(routeID: TRouteID) {
  const routeApi = getRouteApi(routeID);
  const routeSearch = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const searchQuery = "q" in routeSearch ? (routeSearch.q ?? "") : "";
  const [inputValue, setInputValue] = useState(searchQuery);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const commitSearch = useDebouncedCallback(
    (value: string) => {
      const trimmed = value.trim();
      void navigate({
        search: (prev) => ({
          ...prev,
          q: trimmed.length > 0 ? trimmed : undefined,
          page: undefined,
        }),
        replace: true,
      });
    },
    { wait: SEARCH_DEBOUNCE_MS },
  );

  function onSearchChange(value: string) {
    setInputValue(value);
    commitSearch(value);
  }

  /**
   * Clears the search input and URL `q` immediately (no debounce).
   */
  function clearSearch() {
    setInputValue("");
    void navigate({
      search: (prev) => ({
        ...prev,
        q: undefined,
        page: undefined,
      }),
      replace: true,
    });
  }

  const isDebouncing = inputValue.trim() !== searchQuery;

  return { inputValue, onSearchChange, clearSearch, isDebouncing };
}
