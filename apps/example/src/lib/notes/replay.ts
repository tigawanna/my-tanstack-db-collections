import type { StoredEvent } from "@tanstack-db-collections/event-sourced";
import type { Note } from "./types";

export function replayNotes(events: ReadonlyArray<StoredEvent>): Note[] {
  const notes = new Map<string, Note>();

  const noteEvents = events
    .filter((event) => event.collectionId === "notes")
    .sort((a, b) => a.localSeq - b.localSeq);

  for (const event of noteEvents) {
    const key = String(event.key);

    if (event.type === "delete") {
      notes.delete(key);
      continue;
    }

    const payload = event.payload as Partial<Note>;
    if (!payload.id) {
      payload.id = key;
    }

    notes.set(key, {
      id: key,
      title: payload.title ?? "",
      description: payload.description ?? "",
      pinned: payload.pinned ?? false,
      starred: payload.starred ?? false,
      status: payload.status ?? "draft",
      updatedAt: payload.updatedAt ?? event.timestamp,
    });
  }

  return Array.from(notes.values()).sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    if (a.starred !== b.starred) {
      return a.starred ? -1 : 1;
    }
    return b.updatedAt - a.updatedAt;
  });
}
