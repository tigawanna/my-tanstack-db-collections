import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { EventsTable } from "@/components/EventsTable";
import { NoteModal } from "@/components/NoteModal";
import { NotesList } from "@/components/NotesList";
import { PayloadModal } from "@/components/PayloadModal";
import {
  createNoteId,
  deleteEvent,
  deleteNote,
  getExplorerData,
  saveNote,
  syncEvents,
} from "@/lib/explorer/server";
import { createEmptyNote, type Note } from "@/lib/notes/types";

type ExplorerEvent = {
  localSeq: number;
  globalSeq: number | null;
  eventId: string;
  collectionId: string;
  type: "insert" | "update" | "delete";
  key: string | number;
  payload: Record<string, string | number | boolean | null>;
  timestamp: number;
  syncStatus: "pending" | "synced";
};

export const Route = createFileRoute("/")({
  loader: () => getExplorerData(),
  component: Home,
});

function Home() {
  const router = useRouter();
  const { events, notes, pendingCount } = Route.useLoaderData();

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isNewNote, setIsNewNote] = useState(false);
  const [payloadEvent, setPayloadEvent] = useState<ExplorerEvent | null>(null);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  async function refresh() {
    await router.invalidate();
  }

  function openCreateNote() {
    setEditingNote(createEmptyNote(createNoteId()));
    setIsNewNote(true);
    setNoteModalOpen(true);
  }

  function openEditNote(note: Note) {
    setEditingNote(note);
    setIsNewNote(false);
    setNoteModalOpen(true);
  }

  async function handleSaveNote(note: Note, isNew: boolean) {
    await saveNote({ data: { note, isNew } });
    await refresh();
  }

  async function handleDeleteNote(note: Note) {
    await deleteNote({ data: { id: note.id } });
    await refresh();
  }

  async function handleDeleteEvent(event: ExplorerEvent) {
    await deleteEvent({ data: { eventId: event.eventId } });
    await refresh();
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);

    try {
      const result = await syncEvents();
      const errorText = result.errors.join("; ");
      setSyncMessage(
        errorText.length > 0
          ? `Synced with errors — pushed ${result.pushed}, pulled ${result.pulled}. ${errorText}`
          : `Synced — pushed ${result.pushed}, pulled ${result.pulled}`,
      );
      await refresh();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Event Store Explorer</h1>
            <p className="mt-1 text-sm text-gray-400">
              Notes CRUD · local event log · Hono sync server · Turso
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-900/40 disabled:opacity-50"
            >
              {syncing ? "Syncing…" : `Sync (${pendingCount} pending)`}
            </button>
          </div>
        </header>

        {syncMessage ? (
          <div className="rounded-lg border border-gray-800 bg-gray-900/60 px-4 py-3 text-sm text-gray-300">
            {syncMessage}
          </div>
        ) : null}

        <NotesList
          notes={notes}
          onCreate={openCreateNote}
          onEdit={openEditNote}
          onDelete={handleDeleteNote}
        />

        <EventsTable
          events={events}
          pendingCount={pendingCount}
          showPendingOnly={showPendingOnly}
          onTogglePendingOnly={() => setShowPendingOnly((value) => !value)}
          onSelect={setPayloadEvent}
          onDelete={handleDeleteEvent}
        />
      </div>

      <NoteModal
        open={noteModalOpen}
        note={editingNote}
        isNew={isNewNote}
        onClose={() => setNoteModalOpen(false)}
        onSave={handleSaveNote}
      />

      <PayloadModal
        open={payloadEvent !== null}
        event={payloadEvent}
        onClose={() => setPayloadEvent(null)}
      />
    </div>
  );
}
