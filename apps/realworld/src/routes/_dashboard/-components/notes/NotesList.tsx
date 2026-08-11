import { ilike } from "@tanstack/db";
import { useLiveQuery } from "@tanstack/react-db";
import { getRouteApi } from "@tanstack/react-router";
import { MoreHorizontal, StickyNote } from "lucide-react";

import { SearchBox } from "@/components/common/SearchBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db, type Todo } from "@/data-access-layer/collections";

import { CreateNoteDialog, DeleteNoteMenuItem, EditNoteMenuItem } from "./NoteDialogs";
import { useNotesSearch } from "./notes-search";

const notesRouteApi = getRouteApi("/_dashboard/");

export function NotesList() {
  const { q } = notesRouteApi.useSearch();
  const keyword = q?.trim() ?? "";

  const { data: notes, isLoading } = useLiveQuery(
    (query) => {
      const base = query.from({ todo: db.collections.todos });
      if (!keyword) return base;
      return base.where(({ todo }) => ilike(todo.title, `%${keyword}%`));
    },
    [keyword],
  );
  if (isLoading) {
    return (
      <NotesListScaffold>
        <NotesTableSkeleton />
      </NotesListScaffold>
    );
  }
  if (!notes || notes.length === 0) {
    return (
      <NotesListScaffold>
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <StickyNote />
            </EmptyMedia>
            <EmptyTitle>No notes yet</EmptyTitle>
            <EmptyDescription>
              Create your first note to get started. Notes stay synced locally and across devices.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </NotesListScaffold>
    );
  }
  return (
    <NotesListScaffold>
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-12 pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notes.map((note) => (
              <NoteRow key={note.id} note={note} />
            ))}
          </TableBody>
        </Table>
      </div>
    </NotesListScaffold>
  );
}

function NoteRow({ note }: { note: Todo }) {
  return (
    <TableRow>
      <TableCell className="max-w-0 pl-4 font-medium">
        <span className="block truncate">{note.title}</span>
      </TableCell>
      <TableCell>
        <NoteStatusBadge status={note.status} />
      </TableCell>
      <TableCell className="text-muted-foreground">{formatNoteDate(note.updatedAt)}</TableCell>
      <TableCell className="pr-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${note.title}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <EditNoteMenuItem note={note} />
            <DeleteNoteMenuItem note={note} />
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function NotesTableSkeleton() {
  return (
    <div className="bg-card rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-12 pr-4 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell className="pl-4">
                <Skeleton className="h-4 w-48" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell className="pr-4 text-right">
                <Skeleton className="ml-auto h-8 w-8 rounded-md" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function formatNoteDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function NoteStatusBadge({ status }: { status: Todo["status"] }) {
  if (status === "complete") {
    return (
      <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
        Complete
      </Badge>
    );
  }

  return (
    <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300">
      Pending
    </Badge>
  );
}

interface NotesListScaffoldProps {
  children: React.ReactNode;
}

function NotesListScaffold({ children }: NotesListScaffoldProps) {
  const { inputValue, onSearchChange, isSearchPending } = useNotesSearch();

  return (
    <div className="bg-muted/30 mx-auto flex min-h-full w-full max-w-5xl flex-col gap-6 rounded-xl p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
        <p className="text-muted-foreground text-sm">Capture tasks and keep them in sync.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <SearchBox
            value={inputValue}
            onValueChange={onSearchChange}
            isPending={isSearchPending}
            placeholder="Search notes by title..."
            aria-label="Search notes"
          />
        </div>
        <CreateNoteDialog />
      </div>

      {children}
    </div>
  );
}
