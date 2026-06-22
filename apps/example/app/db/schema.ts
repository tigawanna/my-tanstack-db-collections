import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  aggregateId: text('aggregate_id').notNull(),
  type: text('type').notNull(),
  payload: text('payload').notNull(),
  version: integer('version').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
