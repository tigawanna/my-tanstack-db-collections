import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { SQLiteColumnBuilderBase } from "drizzle-orm/sqlite-core";

import type { MutationType, OutboxSyncStatus } from "../protocol";

/** Required outbox columns — do not rename JS keys or SQL names. */
export const sqliteOutboxRequiredColumns = {
  eventId: text("event_id").primaryKey(),
  collectionId: text("collection_id").notNull(),
  type: text("type").$type<MutationType>().notNull(),
  /** Stringified collection key for SQL portability. */
  key: text("key").notNull(),
  payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  timestamp: integer("timestamp").notNull(),
  localSeq: integer("local_seq").notNull(),
  globalSeq: integer("global_seq"),
  sync: integer("sync", { mode: "boolean" }).notNull().default(false),
  syncStatus: text("sync_status").$type<OutboxSyncStatus>().notNull().default("pending"),
  attemptCount: integer("attempt_count").notNull().default(0),
  lastAttemptAt: integer("last_attempt_at"),
  lastError: text("last_error"),
  lastErrorCode: text("last_error_code"),
  retryable: integer("retryable", { mode: "boolean" }),
};

/** Required inbox columns — do not rename JS keys or SQL names. */
export const sqliteInboxRequiredColumns = {
  eventId: text("event_id").primaryKey(),
  globalSeq: integer("global_seq").notNull(),
  collectionId: text("collection_id").notNull(),
  type: text("type").$type<MutationType>().notNull(),
  key: text("key").notNull(),
  payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  timestamp: integer("timestamp").notNull(),
  sync: integer("sync", { mode: "boolean" }).notNull().default(false),
};

/**
 * Define an outbox table. Spread required columns + optional extras.
 * Run migrations in your app so extras are added to the DB.
 */
export function defineOutboxTable<
  TExtra extends Record<string, SQLiteColumnBuilderBase> = Record<string, never>,
>(name = "sync_outbox", extra?: TExtra) {
  return sqliteTable(name, {
    ...sqliteOutboxRequiredColumns,
    ...(extra ?? ({} as TExtra)),
  });
}

/**
 * Define an inbox table. Spread required columns + optional extras.
 * Run migrations in your app so extras are added to the DB.
 */
export function defineInboxTable<
  TExtra extends Record<string, SQLiteColumnBuilderBase> = Record<string, never>,
>(name = "sync_inbox", extra?: TExtra) {
  return sqliteTable(name, {
    ...sqliteInboxRequiredColumns,
    ...(extra ?? ({} as TExtra)),
  });
}

/** Default unextended outbox table. */
export const defaultSqliteOutbox = defineOutboxTable();

/** Default unextended inbox table. */
export const defaultSqliteInbox = defineInboxTable();
