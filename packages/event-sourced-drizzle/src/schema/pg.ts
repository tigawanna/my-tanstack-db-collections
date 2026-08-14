import { bigint, boolean, integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import type { PgColumnBuilderBase } from "drizzle-orm/pg-core";

import type { MutationType, OutboxSyncStatus } from "../internal/types";

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

/** Sync metadata key-value table. */
export const pgSyncMetaColumns = {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
};

export function defineSyncMetaTable(name = "sync_meta") {
  return pgTable(name, { ...pgSyncMetaColumns });
}

export const defaultPgSyncMeta = defineSyncMetaTable();

/** Dead-letter table columns. */
export const pgDeadLetterColumns = {
  eventId: text("event_id").primaryKey(),
  collectionId: text("collection_id").notNull(),
  type: text("type").$type<MutationType>().notNull(),
  key: text("key").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  previous: jsonb("previous").$type<Record<string, unknown> | null>(),
  txId: text("tx_id"),
  clientId: text("client_id"),
  schemaVersion: integer("schema_version").notNull().default(1),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  localSeq: integer("local_seq"),
  globalSeq: bigint("global_seq", { mode: "number" }),
  direction: text("direction").$type<"outbound" | "inbound">().notNull(),
  reason: text("reason").notNull(),
  message: text("message").notNull(),
  code: text("code"),
  attemptCount: integer("attempt_count").notNull().default(0),
  failedAt: bigint("failed_at", { mode: "number" }).notNull(),
};

export function defineDeadLetterTable(name = "sync_dead_letter") {
  return pgTable(name, { ...pgDeadLetterColumns });
}

export const defaultPgDeadLetter = defineDeadLetterTable();
