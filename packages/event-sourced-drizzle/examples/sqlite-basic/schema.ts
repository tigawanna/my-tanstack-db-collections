// @ts-nocheck
/**
 * Drizzle schema for a basic todo app with event-sourced sync.
 *
 * Includes:
 * - Domain table (todos)
 * - Outbox + inbox (with optional extra columns)
 * - Sync metadata + dead-letter tables
 */
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import {
  defineDeadLetterTable,
  defineInboxTable,
  defineOutboxTable,
  defineSyncMetaTable,
} from "event-sourced-drizzle/sqlite";

// --- Domain tables ---

export const todos = sqliteTable("todos", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").$type<"pending" | "complete">().notNull().default("pending"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// --- Sync infrastructure tables ---

// Outbox with a custom `deviceId` column for multi-device attribution.
export const outbox = defineOutboxTable("sync_outbox", {
  deviceId: text("device_id"),
});

// Inbox with a `receivedAt` timestamp for observability.
export const inbox = defineInboxTable("sync_inbox", {
  receivedAt: integer("received_at"),
});

export const syncMeta = defineSyncMetaTable("sync_meta");
export const deadLetter = defineDeadLetterTable("sync_dead_letter");
