import type { DrizzleAdapter } from "./types";
import {
  SYNCMETA_KEY_BACKEND_ID,
  SYNCMETA_KEY_CLIENT_ID,
  SYNCMETA_KEY_CURSOR,
  SYNCMETA_KEY_LAST_ERROR,
  SYNCMETA_KEY_LAST_SYNC_AT,
} from "./constants";

export async function readPullCursor(adapter: DrizzleAdapter): Promise<number> {
  const raw = await adapter.readMeta(SYNCMETA_KEY_CURSOR);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function writePullCursor(adapter: DrizzleAdapter, cursor: number): Promise<void> {
  await adapter.writeMeta(SYNCMETA_KEY_CURSOR, String(cursor));
}

export async function readClientId(adapter: DrizzleAdapter): Promise<string | null> {
  return adapter.readMeta(SYNCMETA_KEY_CLIENT_ID);
}

export async function writeClientId(adapter: DrizzleAdapter, clientId: string): Promise<void> {
  await adapter.writeMeta(SYNCMETA_KEY_CLIENT_ID, clientId);
}

export async function resolveClientId(
  adapter: DrizzleAdapter,
  configClientId: string | undefined,
  generateId: () => string,
): Promise<string> {
  if (configClientId) {
    await writeClientId(adapter, configClientId);
    return configClientId;
  }

  const existing = await readClientId(adapter);
  if (existing) return existing;

  const newId = generateId();
  await writeClientId(adapter, newId);
  return newId;
}

export async function readBackendId(adapter: DrizzleAdapter): Promise<string | null> {
  return adapter.readMeta(SYNCMETA_KEY_BACKEND_ID);
}

export async function writeBackendId(adapter: DrizzleAdapter, id: string): Promise<void> {
  await adapter.writeMeta(SYNCMETA_KEY_BACKEND_ID, id);
}

export async function writeSyncOutcome(
  adapter: DrizzleAdapter,
  now: number,
  error: string | null,
): Promise<void> {
  await adapter.writeMeta(SYNCMETA_KEY_LAST_SYNC_AT, String(now));
  await adapter.writeMeta(SYNCMETA_KEY_LAST_ERROR, error ?? "");
}
