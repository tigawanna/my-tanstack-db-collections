import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Star } from "lucide-react";

export type Movie = {
  id: string;
  title: string;
  description: string;
  image: string;
  rating: number;
  releaseDate: string;
};

type MoviesTableProps = {
  data: Movie[] | undefined;
  isLoading?: boolean;
};

export function MoviesTable({ data, isLoading = false }: MoviesTableProps) {
  if (isLoading) {
    return <MoviesTableSkeleton />;
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
            <TableHead className="pr-4">Released</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((movie, idx) => (
            <MovieRow idx={idx} key={movie.id} movie={movie} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MovieRow({ movie, idx }: { movie: Movie; idx: number }) {
  return (
    <TableRow>
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
      <TableCell className="text-muted-foreground pr-4 tabular-nums">
        {formatReleaseDate(movie.releaseDate)}
      </TableCell>
    </TableRow>
  );
}

function MoviesTableSkeleton() {
  return (
    <div className="bg-card rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Title</TableHead>
            <TableHead className="hidden md:table-cell">Description</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead className="pr-4">Released</TableHead>
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
              <TableCell className="pr-4">
                <Skeleton className="h-4 w-24" />
              </TableCell>
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
