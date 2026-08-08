import { bigint, boolean, integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import type { PgColumnBuilderBase } from "drizzle-orm/pg-core";

import type { MutationType, OutboxSyncStatus } from "../protocol";

/** Required outbox columns — do not rename JS keys or SQL names. */
export const pgOutboxRequiredColumns = {
  eventId: text("event_id").primaryKey(),
  collectionId: text("collection_id").notNull(),
  type: text("type").$type<MutationType>().notNull(),
  /** Stringified collection key for SQL portability. */
  key: text("key").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  localSeq: integer("local_seq").notNull(),
  globalSeq: bigint("global_seq", { mode: "number" }),
  sync: boolean("sync").notNull().default(false),
  syncStatus: text("sync_status").$type<OutboxSyncStatus>().notNull().default("pending"),
  attemptCount: integer("attempt_count").notNull().default(0),
  lastAttemptAt: bigint("last_attempt_at", { mode: "number" }),
  lastError: text("last_error"),
  lastErrorCode: text("last_error_code"),
  retryable: boolean("retryable"),
};

/** Required inbox columns — do not rename JS keys or SQL names. */
export const pgInboxRequiredColumns = {
  eventId: text("event_id").primaryKey(),
  globalSeq: bigint("global_seq", { mode: "number" }).notNull(),
  collectionId: text("collection_id").notNull(),
  type: text("type").$type<MutationType>().notNull(),
  key: text("key").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  sync: boolean("sync").notNull().default(false),
};

/**
 * Define an outbox table (Postgres / PGlite). Spread required columns + extras.
 */
export function defineOutboxTable<
  TExtra extends Record<string, PgColumnBuilderBase> = Record<string, never>,
>(name = "sync_outbox", extra?: TExtra) {
  return pgTable(name, {
    ...pgOutboxRequiredColumns,
    ...(extra ?? ({} as TExtra)),
  });
}

/**
 * Define an inbox table (Postgres / PGlite). Spread required columns + extras.
 */
export function defineInboxTable<
  TExtra extends Record<string, PgColumnBuilderBase> = Record<string, never>,
>(name = "sync_inbox", extra?: TExtra) {
  return pgTable(name, {
    ...pgInboxRequiredColumns,
    ...(extra ?? ({} as TExtra)),
  });
}

/** Default unextended outbox table. */
export const defaultPgOutbox = defineOutboxTable();

/** Default unextended inbox table. */
export const defaultPgInbox = defineInboxTable();
