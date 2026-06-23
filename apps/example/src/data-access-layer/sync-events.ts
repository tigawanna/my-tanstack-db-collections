import type { SyncResult } from "@tanstack-db-collections/event-sourced";

import { ensureDb } from "./collections";

export async function syncEvents(): Promise<SyncResult> {
  const database = await ensureDb();
  return database.sync();
}
