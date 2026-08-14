import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Bookmark, BookmarkCheck, ChevronRight, Star } from "lucide-react";

export type Movie = {
  id: string;
  title: string;
  description: string;
  image: string;
  rating: number;
  releaseDate: string;
  watchlistId?: string | null;
  onWatchlist?: boolean;
};

type MoviesTableProps = {
  data: Movie[] | undefined;
  isLoading?: boolean;
  onToggleWatchlist?: (movie: Movie) => void;
  onDetailsClick?: (movie: Movie) => void;
};

export function MoviesTable({
  data,
  isLoading = false,
  onToggleWatchlist,
  onDetailsClick,
}: MoviesTableProps) {
  if (isLoading) {
    return <MoviesTableSkeleton showWatchlist={Boolean(onToggleWatchlist)} />;
  }

  if (!data || data.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>No movies</EmptyTitle>
          <EmptyDescription>No movies found for this view.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="bg-card rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Idx</TableHead>
            <TableHead className="pl-4">Title</TableHead>
            <TableHead className="hidden md:table-cell">Description</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead className={onToggleWatchlist ? undefined : "pr-4"}>Released</TableHead>
            {onToggleWatchlist ? (
              <TableHead className="pr-4 text-right">Watchlist</TableHead>
            ) : null}
            <TableHead className="pr-4 text-right">
              <ChevronRight />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((movie, idx) => (
            <MovieRow
              idx={idx}
              key={movie.id}
              movie={movie}
              onToggleWatchlist={onToggleWatchlist}
              onDetailsClick={onDetailsClick}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MovieRow({
  movie,
  idx,
  onToggleWatchlist,
  onDetailsClick,
}: {
  movie: Movie;
  idx: number;
  onToggleWatchlist?: (movie: Movie) => void;
  onDetailsClick?: (movie: Movie) => void;
}) {
  return (
    <TableRow className="cursor-pointer hover:bg-muted">
      <TableCell>{idx + 1}</TableCell>
      <TableCell className="max-w-56 pl-4 font-medium whitespace-normal">
        <span className="line-clamp-2">{movie.title}</span>
      </TableCell>
      <TableCell className="text-muted-foreground hidden max-w-md whitespace-normal md:table-cell">
        <span className="line-clamp-2">{movie.description}</span>
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
          {movie.rating}/5
        </span>
      </TableCell>
      <TableCell
        className={`text-muted-foreground tabular-nums ${onToggleWatchlist ? "" : "pr-4"}`}
      >
        {formatReleaseDate(movie.releaseDate)}
      </TableCell>
      {onToggleWatchlist ? (
        <TableCell className="pr-4 text-right">
          <Button
            type="button"
            size="sm"
            variant={movie.onWatchlist ? "secondary" : "outline"}
            onClick={() => onToggleWatchlist(movie)}
            aria-label={movie.onWatchlist ? "Remove from watchlist" : "Add to watchlist"}
          >
            {movie.onWatchlist ? <BookmarkCheck /> : <Bookmark />}
            {movie.onWatchlist ? "Saved" : "Add"}
          </Button>
        </TableCell>
      ) : null}
      <TableCell>
        <Button
          className="hover:bg-primary-foreground"
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onDetailsClick?.(movie)}
        >
          <ChevronRight />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function MoviesTableSkeleton({ showWatchlist }: { showWatchlist?: boolean }) {
  return (
    <div className="bg-card rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Title</TableHead>
            <TableHead className="hidden md:table-cell">Description</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead className={showWatchlist ? undefined : "pr-4"}>Released</TableHead>
            {showWatchlist ? <TableHead className="pr-4 text-right">Watchlist</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell className="pl-4">
                <Skeleton className="h-4 w-40" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-4 w-64" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-12" />
              </TableCell>
              <TableCell className={showWatchlist ? undefined : "pr-4"}>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              {showWatchlist ? (
                <TableCell className="pr-4">
                  <Skeleton className="ml-auto h-8 w-16" />
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function formatReleaseDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}
