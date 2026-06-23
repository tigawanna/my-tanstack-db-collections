import { useState } from "react";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { getRouteApi } from "@tanstack/react-router";

const SEARCH_DEBOUNCE_MS = 300;

const notesRouteApi = getRouteApi("/_dashboard/");

export function useNotesSearch() {
  const { q } = notesRouteApi.useSearch();
  const navigate = notesRouteApi.useNavigate();
  const [inputValue, setInputValue] = useState(q ?? "");

  const commitSearch = useDebouncedCallback(
    (value: string) => {
      const trimmed = value.trim();
      void navigate({
        search: (prev) => ({ ...prev, q: trimmed.length > 0 ? trimmed : undefined }),
        replace: true,
      });
    },
    { wait: SEARCH_DEBOUNCE_MS },
  );

  function onSearchChange(value: string) {
    setInputValue(value);
    commitSearch(value);
  }

  const isSearchPending = inputValue.trim() !== (q ?? "");

  return { inputValue, onSearchChange, isSearchPending };
}
