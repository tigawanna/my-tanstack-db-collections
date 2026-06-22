import { useState } from "react";
import { uuidv7 } from "uuidv7";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { db, type Todo } from "@/data-access-layer/collections";

import { NotesForm, type NoteFormValues } from "./NotesFoem";

interface CreateNoteDialogProps {
  trigger?: React.ReactNode;
}

export function CreateNoteDialog({ trigger }: CreateNoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleCreate = async (values: NoteFormValues) => {
    setIsPending(true);
    try {
      const now = Date.now();
      db.collections.todos.insert({
        id: uuidv7(),
        userId: "local",
        title: values.title.trim(),
        status: values.status,
        createdAt: now,
        updatedAt: now,
      });
      setOpen(false);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            Add Note
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Note</DialogTitle>
        </DialogHeader>
        {open ? (
          <NotesForm onSave={handleCreate} isPending={isPending} submitLabel="Create Note" />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface UpdateNoteDialogProps {
  note: Todo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateNoteDialog({ note, open, onOpenChange }: UpdateNoteDialogProps) {
  const [isPending, setIsPending] = useState(false);

  const handleUpdate = async (values: NoteFormValues) => {
    if (!note) return;

    setIsPending(true);
    try {
      db.collections.todos.update(note.id, (draft) => {
        draft.title = values.title.trim();
        draft.status = values.status;
        draft.updatedAt = Date.now();
      });
      onOpenChange(false);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
        </DialogHeader>
        {open && note ? (
          <NotesForm
            key={note.id}
            defaultValues={{ title: note.title, status: note.status }}
            onSave={handleUpdate}
            isPending={isPending}
            submitLabel="Save Note"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface DeleteNoteDialogProps {
  note: Todo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteNoteDialog({ note, open, onOpenChange }: DeleteNoteDialogProps) {
  const [isPending, setIsPending] = useState(false);

  const handleDelete = async () => {
    if (!note) return;

    setIsPending(true);
    try {
      db.collections.todos.delete(note.id);
      onOpenChange(false);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete note?</AlertDialogTitle>
          <AlertDialogDescription>
            {note
              ? `"${note.title}" will be permanently removed. This action cannot be undone.`
              : "This note will be permanently removed. This action cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              void handleDelete();
            }}
          >
            {isPending ? <Spinner /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
