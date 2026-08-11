import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
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
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { db, type Todo } from "@/data-access-layer/collections";
import { syncEvents } from "@/data-access-layer/sync-events";

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
      void syncEvents();
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

interface EditNoteMenuItemProps {
  note: Todo;
}

export function EditNoteMenuItem({ note }: EditNoteMenuItemProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleUpdate = async (values: NoteFormValues) => {
    setIsPending(true);
    try {
      db.collections.todos.update(note.id, (draft) => {
        draft.title = values.title.trim();
        draft.status = values.status;
        draft.updatedAt = Date.now();
      });
      void syncEvents();
      setOpen(false);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
      >
        <Pencil />
        Edit
      </DropdownMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          {open ? (
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
    </>
  );
}

interface DeleteNoteMenuItemProps {
  note: Todo;
}

export function DeleteNoteMenuItem({ note }: DeleteNoteMenuItemProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleDelete = async () => {
    setIsPending(true);
    try {
      db.collections.todos.delete(note.id);
      void syncEvents();
      setOpen(false);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <DropdownMenuItem
        variant="destructive"
        onSelect={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
      >
        <Trash2 />
        Delete
      </DropdownMenuItem>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{note.title}&rdquo; will be permanently removed. This action cannot be undone.
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
    </>
  );
}
