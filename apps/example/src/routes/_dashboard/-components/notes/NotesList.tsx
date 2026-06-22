import { useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { MoreHorizontal, Pencil, StickyNote, Trash2 } from "lucide-react";

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
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { db, type Todo } from "@/data-access-layer/collections";

import { CreateNoteDialog, DeleteNoteDialog, UpdateNoteDialog } from "./NoteDialogs";

function formatNoteDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function NoteStatusBadge({ status }: { status: Todo["status"] }) {
  if (status === "complete") {
    return <Badge variant="secondary">Complete</Badge>;
  }

  return <Badge variant="outline">Pending</Badge>;
}

function NoteCard({
  note,
  onEdit,
  onDelete,
}: {
  note: Todo;
  onEdit: (note: Todo) => void;
  onDelete: (note: Todo) => void;
}) {
  return (
    <Card className="gap-4 py-4">
      <CardHeader className="px-4">
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
              <DropdownMenuItem onClick={() => onEdit(note)}>
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(note)}>
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className="px-4">
        <NoteStatusBadge status={note.status} />
      </CardContent>
    </Card>
  );
}

export function NotesList() {
  const { data: todos, isLoading } = useLiveQuery((q) => q.from({ todo: db.collections.todos }));
  const [editingNote, setEditingNote] = useState<Todo | null>(null);
  const [deletingNote, setDeletingNote] = useState<Todo | null>(null);

  if (isLoading) {
    return (
      <div className="flex w-full items-center justify-center py-16">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (!todos || todos.length === 0) {
    return (
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
        <EmptyContent>
          <CreateNoteDialog trigger={<Button>Add Note</Button>} />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        {todos.map((note) => (
          <NoteCard key={note.id} note={note} onEdit={setEditingNote} onDelete={setDeletingNote} />
        ))}
      </div>

      <UpdateNoteDialog
        note={editingNote}
        open={editingNote !== null}
        onOpenChange={(open) => {
          if (!open) setEditingNote(null);
        }}
      />

      <DeleteNoteDialog
        note={deletingNote}
        open={deletingNote !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingNote(null);
        }}
      />
    </>
  );
}

interface NotesListScaffoldProps {
  children: React.ReactNode;
}

export function NotesListScaffold({ children }: NotesListScaffoldProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
          <p className="text-muted-foreground text-sm">Capture tasks and keep them in sync.</p>
        </div>
        <CreateNoteDialog />
      </div>
      {children}
    </div>
  );
}
