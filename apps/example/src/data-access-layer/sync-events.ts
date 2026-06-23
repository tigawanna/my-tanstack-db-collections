import type { ManualSyncResult, SyncResult } from "event-sourced-collection";

import { ensureDb } from "./collections";

export async function syncEvents(): Promise<SyncResult> {
  const database = await ensureDb();
  return database.sync();
}

export async function manualSyncEvents(): Promise<ManualSyncResult> {
  const database = await ensureDb();
  return database.manualSync();
}
