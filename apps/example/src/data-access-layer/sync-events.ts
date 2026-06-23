import type { SyncResult } from "@tanstack-db-collections/event-sourced";

import { db } from "./collections";

export async function syncEvents(): Promise<SyncResult> {
  return db.sync();
}
