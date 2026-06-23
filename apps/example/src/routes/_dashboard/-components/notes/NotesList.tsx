import { ilike } from "@tanstack/db";
import { useLiveQuery } from "@tanstack/react-db";
import { getRouteApi } from "@tanstack/react-router";
import { MoreHorizontal, StickyNote } from "lucide-react";

import { SearchBox } from "@/components/common/SearchBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
        <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        </div>
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
    <div className="grid w-full h-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}

function NoteCard({ note }: { note: Todo }) {
  const accent = note.status === "complete" ? "bg-emerald-500" : "bg-amber-500";

  return (
    <Card className="bg-card relative gap-4 overflow-hidden border py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} aria-hidden />
      <CardHeader className="px-4 pl-5">
        <CardTitle className="line-clamp-2 text-base">{note.title}</CardTitle>
        <CardDescription>Updated {formatNoteDate(note.updatedAt)}</CardDescription>
        <CardAction>
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
        </CardAction>
      </CardHeader>
      <CardContent className="px-4 pl-5">
        <NoteStatusBadge status={note.status} />
      </CardContent>
    </Card>
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
