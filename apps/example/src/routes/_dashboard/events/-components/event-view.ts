import type { InboxEntry, MutationType, OutboxEntry } from "event-sourced-collection";

export type SyncEventView = {
  eventId: string;
  collectionId: string;
  type: MutationType;
  key: string;
  payload: Record<string, unknown>;
  timestamp: number;
  sync: boolean;
  globalSeq: number | null;
};

export function toEventView(entry: OutboxEntry | InboxEntry): SyncEventView {
  return {
    eventId: entry.eventId,
    collectionId: entry.collectionId,
    type: entry.type,
    key: String(entry.key),
    payload: entry.payload,
    timestamp: entry.timestamp,
    sync: entry.sync,
    globalSeq: entry.globalSeq ?? null,
  };
}

export function formatEventDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}
