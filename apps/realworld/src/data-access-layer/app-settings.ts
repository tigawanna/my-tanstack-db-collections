import type { AppSettings } from "./collections";
import { db, ensureDb } from "./collections";

export const APP_SETTINGS_ID = "app";

const DEFAULT_APP_SETTINGS: AppSettings = {
  id: APP_SETTINGS_ID,
  theme: "dark",
  language: "en",
  syncEnabled: true,
};

export async function ensureAppSettings(): Promise<AppSettings> {
  const database = await ensureDb();
  const existing = database.collections.settings.get(APP_SETTINGS_ID);

  if (!existing) {
    await database.collections.settings.insert(DEFAULT_APP_SETTINGS).isPersisted.promise;
    database.setSyncEnabled(DEFAULT_APP_SETTINGS.syncEnabled);
    return DEFAULT_APP_SETTINGS;
  }

  const syncEnabled = existing.syncEnabled ?? true;

  if (existing.syncEnabled === undefined) {
    await database.collections.settings.update(APP_SETTINGS_ID, (draft) => {
      draft.syncEnabled = true;
    }).isPersisted.promise;
  }

  database.setSyncEnabled(syncEnabled);

  return { ...existing, syncEnabled };
}

export async function setSyncEnabled(enabled: boolean): Promise<void> {
  const database = await ensureDb();
  database.setSyncEnabled(enabled);

  const existing = database.collections.settings.get(APP_SETTINGS_ID);
  if (!existing) {
    await database.collections.settings.insert({ ...DEFAULT_APP_SETTINGS, syncEnabled: enabled })
      .isPersisted.promise;
    return;
  }

  await database.collections.settings.update(APP_SETTINGS_ID, (draft) => {
    draft.syncEnabled = enabled;
  }).isPersisted.promise;
}

export function readSyncEnabled(): boolean {
  const existing = db.collections.settings.get(APP_SETTINGS_ID);
  return existing?.syncEnabled ?? true;
}
