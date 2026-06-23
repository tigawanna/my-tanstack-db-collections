import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import type { EvlogWideEvent } from "@/types/evlog";

const DEFAULT_LOG_DIR = ".evlog/logs";

function getLogDir() {
  return process.env["EVLOG_FS_DIR"] ?? process.env["NUXT_EVLOG_FS_DIR"] ?? DEFAULT_LOG_DIR;
}

function parseEvlogFile(content: string): EvlogWideEvent[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("{") && !trimmed.includes("\n{")) {
    try {
      return [JSON.parse(trimmed) as EvlogWideEvent];
    } catch {
      return [];
    }
  }

  const events: EvlogWideEvent[] = [];
  let depth = 0;
  let start = -1;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (char === "{") {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        try {
          events.push(JSON.parse(content.slice(start, index + 1)) as EvlogWideEvent);
        } catch {
          // skip malformed chunks
        }
        start = -1;
      }
    }
  }

  return events;
}

export async function listEvlogDates(): Promise<string[]> {
  const dir = getLogDir();
  const files = await readdir(dir);
  const dates = new Set<string>();

  for (const file of files) {
    const match = file.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match?.[1]) dates.add(match[1]);
  }

  return [...dates].sort((a, b) => b.localeCompare(a));
}

export async function readEvlogEvents(options?: {
  date?: string;
  limit?: number;
}): Promise<{ date: string; files: string[]; events: EvlogWideEvent[] }> {
  const dir = getLogDir();
  const date = options?.date ?? new Date().toISOString().slice(0, 10);
  const limit = options?.limit ?? 200;

  const files = (await readdir(dir))
    .filter((file) => file.startsWith(date) && file.endsWith(".jsonl"))
    .sort();

  const events: EvlogWideEvent[] = [];

  for (const file of files) {
    const content = await readFile(join(dir, file), "utf-8");
    events.push(...parseEvlogFile(content));
  }

  events.sort((a, b) => {
    const aTime = a.timestamp ? Date.parse(a.timestamp) : 0;
    const bTime = b.timestamp ? Date.parse(b.timestamp) : 0;
    return bTime - aTime;
  });

  return {
    date,
    files,
    events: events.slice(0, limit),
  };
}
