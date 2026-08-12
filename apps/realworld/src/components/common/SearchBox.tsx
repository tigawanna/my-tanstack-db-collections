import { Input } from "@/components/ui/input";
import { Loader, X } from "lucide-react";
import { useRef } from "react";

interface SearchBoxProps {
  keyword: string;
  setKeyword: (value: string) => void;
  isDebouncing: boolean;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

export function SearchBox({ isDebouncing, setKeyword, keyword, inputProps }: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="sticky top-0 w-full">
      <div className="relative w-full">
        <Input
          ref={inputRef}
          placeholder="Search"
          className="bg-base-200/30 w-full"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
          }}
          {...inputProps}
        />
        {keyword && keyword.length > 0 && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            <X
              className="size-4"
              onClick={() => {
                setKeyword("");
              }}
            />
          </div>
        )}
        {isDebouncing && (
          <div className="absolute inset-y-0 right-[3%] flex items-center pr-3">
            <Loader className="size-4 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
