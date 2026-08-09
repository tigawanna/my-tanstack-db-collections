/**
 * Drizzle sync engine schema for the example app.
 *
 * This is the copy-paste pattern for embedded SQLite apps:
 * - extend inbox/outbox with app-specific columns
 * - own migrations via drizzle-kit
 * - infer row types from the tables (no casts in hooks)
 *
 * Separate from the TanStack DB `event-sourced-collection` path under /events.
 */

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { defineInboxTable, defineOutboxTable } from "drizzle-sync-engine/sqlite";

/** Outbox with demo extras — migrate these in your app when you adopt the engine. */
export const drizzleSyncOutbox = defineOutboxTable("drizzle_sync_outbox", {
  deviceId: text("device_id"),
  priority: integer("priority").default(0),
});

/** Inbox with a receivedAt stamp filled in `onPullInbox`. */
export const drizzleSyncInbox = defineInboxTable("drizzle_sync_inbox", {
  receivedAt: integer("received_at"),
});

/** Example domain table the engine would apply events into. */
export const drizzleSyncNotes = sqliteTable("drizzle_sync_notes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  updatedAt: integer("updated_at").notNull(),
});

export type DrizzleSyncOutboxRow = typeof drizzleSyncOutbox.$inferSelect;
export type DrizzleSyncInboxRow = typeof drizzleSyncInbox.$inferSelect;
export type DrizzleSyncNote = typeof drizzleSyncNotes.$inferSelect;

export const drizzleSyncSchema = {
  drizzleSyncOutbox,
  drizzleSyncInbox,
  drizzleSyncNotes,
};
