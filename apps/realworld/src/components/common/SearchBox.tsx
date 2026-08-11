import { useRef } from "react";
import { Loader2, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  isPending?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}

export function SearchBox({
  value,
  onValueChange,
  isPending = false,
  placeholder = "Search...",
  className,
  "aria-label": ariaLabel = "Search",
}: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasValue = value.length > 0;

  return (
    <div className={cn("group relative w-full", className)}>
      <Search className="text-muted-foreground group-focus-within:text-foreground pointer-events-none absolute inset-y-0 left-3 my-auto size-4 transition-colors" />
      <Input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="bg-muted/40 focus-visible:bg-background border-muted-foreground/20 pr-9 pl-9 [&::-webkit-search-cancel-button]:appearance-none"
      />
      <div className="absolute inset-y-0 right-2 flex items-center gap-1">
        {isPending ? (
          <Loader2 className="text-muted-foreground size-4 animate-spin" aria-hidden />
        ) : null}
        {hasValue ? (
          <button
            type="button"
            onClick={() => {
              onValueChange("");
              inputRef.current?.focus();
            }}
            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-full p-0.5 transition-colors"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
