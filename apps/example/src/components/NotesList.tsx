import type { Note } from "@/lib/notes/types";

type NotesListProps = {
  notes: Note[];
  onCreate: () => void;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => Promise<void>;
};

export function NotesList({ notes, onCreate, onEdit, onDelete }: NotesListProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-100">Notes</h2>
          <p className="text-sm text-gray-500">Materialized from the local event log</p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500"
        >
          New note
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-800 px-6 py-12 text-center text-sm text-gray-500">
          No notes yet. Create one to generate insert events.
        </div>
      ) : (
        <div className="grid gap-3">
          {notes.map((note) => (
            <article
              key={note.id}
              className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 transition-colors hover:border-gray-700"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-medium text-gray-100">{note.title}</h3>
                    {note.pinned ? (
                      <span className="rounded-full bg-amber-950 px-2 py-0.5 text-xs text-amber-300">
                        pinned
                      </span>
                    ) : null}
                    {note.starred ? (
                      <span className="rounded-full bg-yellow-950 px-2 py-0.5 text-xs text-yellow-300">
                        starred
                      </span>
                    ) : null}
                    <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs capitalize text-gray-300">
                      {note.status}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-400">
                    {note.description || "No description"}
                  </p>
                  <p className="mt-2 font-mono text-xs text-gray-600">{note.id.slice(0, 12)}…</p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(note)}
                    className="rounded-md border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(note)}
                    className="rounded-md border border-red-900 px-3 py-1.5 text-xs text-red-300 hover:bg-red-950/40"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
