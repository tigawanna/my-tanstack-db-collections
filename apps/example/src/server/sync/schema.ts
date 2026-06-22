import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Append-only log of collection mutation events replicated between clients and the server.
 *
 * `globalSeq` is the monotonic cursor used by pull handlers. `eventId` enforces
 * idempotent pushes.
 */
export const syncEvents = sqliteTable(
  "sync_events",
  {
    globalSeq: integer("global_seq").primaryKey({ autoIncrement: true }),
    eventId: text("event_id").notNull().unique(),
    collectionId: text("collection_id").notNull(),
    type: text("type").notNull(),
    key: text("key").notNull(),
    payload: text("payload").notNull(),
    clientTimestamp: integer("client_timestamp").notNull(),
    serverTimestamp: integer("server_timestamp")
      .notNull()
      .default(sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`),
  },
  (table) => [index("idx_sync_events_global_seq").on(table.globalSeq)],
);
