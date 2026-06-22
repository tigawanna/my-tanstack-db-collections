import { unlinkSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EventStore, generateEventId } from "@tanstack-db-collections/event-sourced";
import { createLibsqlDriver } from "@/lib/event-store/libsql-driver";
import {
  appendStoredEvent,
  deleteStoredEvent,
  listStoredEvents,
  resetEventStoreForTests,
  syncLocalEvents,
} from "@/lib/event-store/server";
import { replayNotes } from "@/lib/notes/replay";

let testDbCounter = 0;

function createTestDbUrl(prefix: string): string {
  testDbCounter += 1;
  return `file:${prefix}-${process.pid}-${testDbCounter}.db`;
}

function dbPathFromUrl(url: string): string {
  return url.replace(/^file:/, "");
}

function removeTestDb(url: string | undefined): void {
  if (!url?.startsWith("file:")) {
    return;
  }

  try {
    unlinkSync(dbPathFromUrl(url));
  } catch {
    // already removed
  }
}

describe("libsql driver + EventStore", () => {
  let store: EventStore;
  let testDbUrl: string;

  beforeEach(async () => {
    testDbUrl = createTestDbUrl("event-store-test");
    const driver = createLibsqlDriver(testDbUrl);
    store = new EventStore(driver);
    await store.initialize();
  });

  afterEach(() => {
    removeTestDb(testDbUrl);
  });

  it("appends events and tracks pending count", async () => {
    const eventId = generateEventId();
    await store.append(eventId, "notes", "insert", "note-1", { title: "Milk" }, Date.now());

    expect(await store.getEventCount()).toBe(1);
    expect(await store.getPendingCount()).toBe(1);
  });

  it("marks events as synced with global sequence", async () => {
    const eventId = generateEventId();
    await store.append(eventId, "notes", "insert", "note-1", { title: "Bread" }, Date.now());

    await store.markSynced([{ eventId, globalSeq: 42 }]);

    expect(await store.getPendingCount()).toBe(0);
  });
});

describe("notes replay + server helpers", () => {
  let databaseUrl: string;
  let syncDatabaseUrl: string;

  beforeEach(async () => {
    databaseUrl = createTestDbUrl("event-store-test");
    syncDatabaseUrl = createTestDbUrl("sync-server-test");
    process.env["DATABASE_URL"] = databaseUrl;
    process.env["SYNC_DATABASE_URL"] = syncDatabaseUrl;
    await resetEventStoreForTests();
  });

  afterEach(() => {
    delete process.env["DATABASE_URL"];
    delete process.env["SYNC_DATABASE_URL"];
    removeTestDb(databaseUrl);
    removeTestDb(syncDatabaseUrl);
  });

  it("lists note events and replays materialized notes", async () => {
    await appendStoredEvent({
      collectionId: "notes",
      type: "insert",
      key: "note-1",
      payload: {
        id: "note-1",
        title: "Write tests",
        description: "Event sourced notes",
        pinned: true,
        starred: false,
        status: "active",
        updatedAt: Date.now(),
      },
    });

    const events = await listStoredEvents();
    const notes = replayNotes(events);

    expect(events).toHaveLength(1);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.title).toBe("Write tests");
    expect(notes[0]?.pinned).toBe(true);
  });

  it("deletes events from the local log", async () => {
    await appendStoredEvent({
      collectionId: "notes",
      type: "insert",
      key: "note-2",
      payload: { id: "note-2", title: "Delete me" },
    });

    const [event] = await listStoredEvents();
    expect(event).toBeDefined();

    const deleted = await deleteStoredEvent(event!.eventId);
    expect(deleted).toBe(true);
    expect(await listStoredEvents()).toHaveLength(0);
  });

  it("syncs pending events to the remote turso store", async () => {
    await appendStoredEvent({
      collectionId: "notes",
      type: "insert",
      key: "note-3",
      payload: {
        id: "note-3",
        title: "Sync me",
        description: "",
        pinned: false,
        starred: false,
        status: "draft",
        updatedAt: Date.now(),
      },
    });

    const result = await syncLocalEvents();
    expect(result.pushed).toBe(1);
    expect(result.errors).toHaveLength(0);

    const events = await listStoredEvents();
    expect(events[0]?.syncStatus).toBe("synced");
  });
});
