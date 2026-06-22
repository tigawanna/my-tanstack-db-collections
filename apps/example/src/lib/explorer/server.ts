import { createServerFn } from "@tanstack/react-start";
import { uuidv7 } from "uuidv7";
import {
  appendStoredEvent,
  deleteStoredEvent,
  getPendingCount,
  listStoredEvents,
  syncLocalEvents,
} from "@/lib/event-store/server";
import { replayNotes } from "@/lib/notes/replay";
import type { StoredEvent, SyncResult } from "@tanstack-db-collections/event-sourced";
import type { Note, NoteStatus } from "@/lib/notes/types";
import { NOTE_STATUSES } from "@/lib/notes/types";

type SerializablePayload = Record<string, string | number | boolean | null>;

type ExplorerEvent = {
  localSeq: number;
  globalSeq: number | null;
  eventId: string;
  collectionId: string;
  type: StoredEvent["type"];
  key: string | number;
  payload: SerializablePayload;
  timestamp: number;
  syncStatus: StoredEvent["syncStatus"];
};

type SyncResponse = {
  pushed: number;
  pulled: number;
  errors: string[];
};

function serializePayload(payload: Record<string, unknown>): SerializablePayload {
  return JSON.parse(JSON.stringify(payload)) as SerializablePayload;
}

function toExplorerEvent(event: StoredEvent): ExplorerEvent {
  return {
    localSeq: event.localSeq,
    globalSeq: event.globalSeq,
    eventId: event.eventId,
    collectionId: event.collectionId,
    type: event.type,
    key: event.key,
    payload: serializePayload(event.payload),
    timestamp: event.timestamp,
    syncStatus: event.syncStatus,
  };
}

function toSyncResponse(result: SyncResult): SyncResponse {
  return {
    pushed: result.pushed,
    pulled: result.pulled,
    errors: result.errors.map((error) => error.message),
  };
}

export const getExplorerData = createServerFn({ method: "GET" }).handler(async () => {
  const events = await listStoredEvents(200);
  const notes = replayNotes(events);
  const pendingCount = await getPendingCount();

  return {
    events: events.map(toExplorerEvent),
    notes,
    pendingCount,
  };
});

type SaveNoteInput = {
  note: Note;
  isNew: boolean;
};

const noteInputValidator = (raw: unknown): SaveNoteInput => {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid note payload");
  }

  const value = raw as Record<string, unknown>;
  const note = value["note"] as Record<string, unknown> | undefined;
  const isNew = value["isNew"];

  if (!note || typeof note["id"] !== "string" || typeof note["title"] !== "string") {
    throw new Error("Invalid note");
  }

  if (typeof note["description"] !== "string") {
    throw new Error("Invalid description");
  }

  if (typeof note["pinned"] !== "boolean" || typeof note["starred"] !== "boolean") {
    throw new Error("Invalid note flags");
  }

  if (!NOTE_STATUSES.includes(note["status"] as NoteStatus)) {
    throw new Error("Invalid note status");
  }

  if (typeof isNew !== "boolean") {
    throw new Error("Invalid isNew flag");
  }

  return {
    isNew,
    note: {
      id: note["id"],
      title: note["title"],
      description: note["description"],
      pinned: note["pinned"],
      starred: note["starred"],
      status: note["status"] as NoteStatus,
      updatedAt: typeof note["updatedAt"] === "number" ? note["updatedAt"] : Date.now(),
    },
  };
};

export const saveNote = createServerFn({ method: "POST" })
  .inputValidator(noteInputValidator)
  .handler(async ({ data }: { data: SaveNoteInput }) => {
    const note = { ...data.note, updatedAt: Date.now() };

    await appendStoredEvent({
      collectionId: "notes",
      type: data.isNew ? "insert" : "update",
      key: note.id,
      payload: note,
    });
  });

export const deleteNote = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => {
    if (
      typeof raw !== "object" ||
      raw === null ||
      typeof (raw as Record<string, unknown>)["id"] !== "string"
    ) {
      throw new Error("Invalid note id");
    }
    return { id: (raw as { id: string }).id };
  })
  .handler(async ({ data }: { data: { id: string } }) => {
    await appendStoredEvent({
      collectionId: "notes",
      type: "delete",
      key: data.id,
      payload: { id: data.id },
    });
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => {
    if (
      typeof raw !== "object" ||
      raw === null ||
      typeof (raw as Record<string, unknown>)["eventId"] !== "string"
    ) {
      throw new Error("Invalid event id");
    }
    return { eventId: (raw as { eventId: string }).eventId };
  })
  .handler(async ({ data }: { data: { eventId: string } }) => {
    const deleted = await deleteStoredEvent(data.eventId);
    if (!deleted) {
      throw new Error("Event not found");
    }
  });

export const syncEvents = createServerFn({ method: "POST" }).handler(async () =>
  toSyncResponse(await syncLocalEvents()),
);

export function createNoteId(): string {
  return uuidv7();
}
