import { integer, text } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";

import { createDrizzleSyncEngine } from "../create-drizzle-sync-engine";
import {
  INBOX_REQUIRED_KEYS,
  OUTBOX_REQUIRED_KEYS,
  type RequiresInboxColumns,
  type RequiresOutboxColumns,
} from "../protocol";
import { defineInboxTable, defineOutboxTable } from "../schema/sqlite";
import {
  defineInboxTable as definePgInboxTable,
  defineOutboxTable as definePgOutboxTable,
} from "../schema/pg";

describe("protocol required keys", () => {
  it("lists stable outbox / inbox column keys", () => {
    expect(OUTBOX_REQUIRED_KEYS).toContain("eventId");
    expect(OUTBOX_REQUIRED_KEYS).toContain("syncStatus");
    expect(INBOX_REQUIRED_KEYS).toContain("globalSeq");
    expect(INBOX_REQUIRED_KEYS).toContain("sync");
  });
});

describe("sqlite schema builders", () => {
  it("builds a default outbox / inbox table", () => {
    const outbox = defineOutboxTable();
    const inbox = defineInboxTable();

    expect(outbox).toBeDefined();
    expect(inbox).toBeDefined();

    type OutboxRow = typeof outbox.$inferSelect;
    type InboxRow = typeof inbox.$inferSelect;

    const _outboxOk: RequiresOutboxColumns<OutboxRow> = {} as OutboxRow;
    const _inboxOk: RequiresInboxColumns<InboxRow> = {} as InboxRow;
    void _outboxOk;
    void _inboxOk;
  });

  it("preserves extra columns in inferred select types", () => {
    const outbox = defineOutboxTable("sync_outbox", {
      deviceId: text("device_id"),
      priority: integer("priority").default(0),
    });
    const inbox = defineInboxTable("sync_inbox", {
      receivedAt: integer("received_at"),
    });

    type OutboxRow = typeof outbox.$inferSelect;
    type InboxRow = typeof inbox.$inferSelect;

    const sampleOutbox = {
      eventId: "e1",
      collectionId: "todos",
      type: "insert" as const,
      key: "t1",
      payload: {},
      timestamp: 1,
      localSeq: 1,
      globalSeq: null,
      sync: false,
      syncStatus: "pending" as const,
      attemptCount: 0,
      lastAttemptAt: null,
      lastError: null,
      lastErrorCode: null,
      retryable: null,
      deviceId: "dev-1",
      priority: 1,
    } satisfies OutboxRow;

    const sampleInbox = {
      eventId: "e2",
      globalSeq: 10,
      collectionId: "todos",
      type: "update" as const,
      key: "t1",
      payload: { title: "x" },
      timestamp: 2,
      sync: false,
      receivedAt: 3,
    } satisfies InboxRow;

    expect(sampleOutbox.deviceId).toBe("dev-1");
    expect(sampleInbox.receivedAt).toBe(3);
  });
});

describe("pg schema builders", () => {
  it("builds default pg tables", () => {
    const outbox = definePgOutboxTable();
    const inbox = definePgInboxTable();
    expect(outbox).toBeDefined();
    expect(inbox).toBeDefined();
  });
});

describe("createDrizzleSyncEngine", () => {
  it("exposes syncEnabled and tables before apply path exists", async () => {
    const outbox = defineOutboxTable("sync_outbox", {
      deviceId: text("device_id"),
    });
    const inbox = defineInboxTable();

    const engine = createDrizzleSyncEngine({
      db: {} as never,
      tables: { outbox, inbox },
      collections: {},
      syncEnabled: true,
      hooks: {
        onAppendOutbox: (row) => ({
          ...row,
          deviceId: row.deviceId ?? "local",
        }),
      },
    });

    expect(engine.getSyncEnabled()).toBe(true);
    engine.setSyncEnabled(false);
    expect(engine.getSyncEnabled()).toBe(false);
    expect(engine.tables.outbox).toBe(outbox);

    await expect(engine.sync()).rejects.toThrow(/not implemented yet/);
  });
});
