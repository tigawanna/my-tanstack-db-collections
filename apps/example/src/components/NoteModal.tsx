import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import type { Note, NoteStatus } from "@/lib/notes/types";
import { NOTE_STATUSES } from "@/lib/notes/types";

type NoteModalProps = {
  open: boolean;
  note: Note | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (note: Note, isNew: boolean) => Promise<void>;
};

export function NoteModal({ open, note, isNew, onClose, onSave }: NoteModalProps) {
  const [draft, setDraft] = useState<Note | null>(note);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(note);
  }, [note]);

  if (!draft) {
    return null;
  }

  async function handleSubmit() {
    if (!draft) {
      return;
    }

    setSaving(true);
    try {
      await onSave(draft, isNew);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isNew ? "Create note" : "Edit note"}
      open={open}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || draft.title.trim().length === 0}
            onClick={handleSubmit}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save note"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Title</span>
          <input
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Description
          </span>
          <textarea
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            rows={4}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Status</span>
          <select
            value={draft.status}
            onChange={(event) => setDraft({ ...draft, status: event.target.value as NoteStatus })}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
          >
            {NOTE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={draft.pinned}
              onChange={(event) => setDraft({ ...draft, pinned: event.target.checked })}
              className="rounded border-gray-600 bg-gray-950"
            />
            Pinned
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={draft.starred}
              onChange={(event) => setDraft({ ...draft, starred: event.target.checked })}
              className="rounded border-gray-600 bg-gray-950"
            />
            Starred
          </label>
        </div>
      </div>
    </Modal>
  );
}
