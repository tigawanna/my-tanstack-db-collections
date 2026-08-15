import type { Collection } from "@tanstack/db";

import type { NormalizedSyncTransport } from "../sync";
import { normalizePushResponse } from "../sync";
import type {
  DeadLetterEntry,
  DeadLetterReason,
  OutboundEvent,
  OutboxEntry,
  PushFailure,
  RowVersionEntry,
} from "../types";
import type { EventSourcedLogger } from "../utils/logger";
import { CONFLICT_ERROR_CODE, DEFAULT_EVENT_SCHEMA_VERSION } from "./constants";
import type { EmitHook } from "./hooks";
import { restoreRowVersionAfterConflict } from "./replay";
import type { ResolvedRetryConfig } from "./types";

export type PushOutcome = {
  pushed: number;
  deadLettered: number;
  /**
   * Set when a batch failed at the transport level. Reported rather than thrown
   * so the counts from batches that already succeeded are not lost.
   */
  error?: Error;
};

export type PushArgs = {
  outbox: Collection<OutboxEntry, string>;
  deadletter: Collection<DeadLetterEntry, string>;
  rowversions: Collection<RowVersionEntry, string>;
  push: NonNullable<NormalizedSyncTransport["push"]>;
  batchSize: number;
  retry: ResolvedRetryConfig;
  now: number;
  emit: EmitHook;
  log: EventSourcedLogger;
};

/**
 * Backoff for attempt N, doubling from `baseDelayMs` and capped at `maxDelayMs`.
 * Deliberately jitter-free so retry scheduling stays reproducible in tests; if
 * you have many clients hitting one server, add jitter in your push handler.
 */
export function backoffDelay(attemptCount: number, retry: ResolvedRetryConfig): number {
  const exponent = Math.max(0, attemptCount - 1);
  const raw = retry.baseDelayMs * 2 ** exponent;
  return Math.min(retry.maxDelayMs, raw);
}

function isDue(entry: OutboxEntry, now: number): boolean {
  if (entry.sync) return false;
  // A permanent rejection is dead-lettered rather than parked, so anything still
  // marked failed here is retryable and just waiting for its backoff window.
  if (entry.syncStatus === "failed" && entry.retryable !== true) return false;
  return (entry.nextAttemptAt ?? 0) <= now;
}

function byLocalSeq(a: OutboxEntry, b: OutboxEntry): number {
  if (a.localSeq !== b.localSeq) return a.localSeq - b.localSeq;
  // localSeq can collide across tabs; eventId is a uuidv7 so it breaks the tie
  // in creation order.
  return a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0;
}

export function toOutboundEvent(entry: OutboxEntry): OutboundEvent {
  return {
    eventId: entry.eventId,
    collectionId: entry.collectionId,
    type: entry.type,
    key: entry.key,
    payload: entry.payload,
    previous: entry.previous ?? null,
    txId: entry.txId,
    clientId: entry.clientId,
    // Rows written before these fields existed are still in persisted outboxes.
    schemaVersion: entry.schemaVersion ?? DEFAULT_EVENT_SCHEMA_VERSION,
    baseVersion: entry.baseVersion ?? null,
    timestamp: entry.timestamp,
  };
}

export async function deadLetter(
  deadletter: Collection<DeadLetterEntry, string>,
  outbox: Collection<OutboxEntry, string>,
  entry: OutboxEntry,
  reason: DeadLetterReason,
  message: string,
  code: string | null,
  now: number,
  emit: EmitHook,
  log: EventSourcedLogger,
  rowversions?: Collection<RowVersionEntry, string>,
): Promise<void> {
  const record: DeadLetterEntry = {
    eventId: entry.eventId,
    collectionId: entry.collectionId,
    type: entry.type,
    key: entry.key,
    payload: entry.payload,
    previous: entry.previous ?? null,
    txId: entry.txId,
    clientId: entry.clientId,
    schemaVersion: entry.schemaVersion ?? DEFAULT_EVENT_SCHEMA_VERSION,
    baseVersion: entry.baseVersion ?? null,
    timestamp: entry.timestamp,
    localSeq: entry.localSeq,
    globalSeq: entry.globalSeq ?? null,
    direction: "outbound",
    reason,
    message,
    code,
    attemptCount: entry.attemptCount,
    failedAt: now,
  };

  if (!deadletter.has(entry.eventId)) {
    await deadletter.insert(record).isPersisted.promise;
  }

  if (outbox.has(entry.eventId)) {
    await outbox.delete(entry.eventId).isPersisted.promise;
  }

  if (reason === "conflict" && rowversions) {
    await restoreRowVersionAfterConflict(
      rowversions,
      entry.collectionId,
      entry.key,
      entry.baseVersion ?? null,
    );
  }

  log.warn("event dead-lettered", {
    eventId: entry.eventId,
    collectionId: entry.collectionId,
    reason,
    message,
    code,
    attemptCount: entry.attemptCount,
  });

  emit("onDeadLetter", record);
}

/**
 * Splits events into batches of at most `size`, without ever separating events
 * that share a `txId`. The server is asked to commit each transaction
 * atomically, which it cannot do if we deliver half of one now and half later.
 * A single transaction larger than `size` is sent whole rather than split.
 */
function batchByTransaction(events: ReadonlyArray<OutboxEntry>, size: number): OutboxEntry[][] {
  const batches: OutboxEntry[][] = [];
  let current: OutboxEntry[] = [];

  for (let index = 0; index < events.length;) {
    const txId = events[index]!.txId;
    const group: OutboxEntry[] = [];

    // Events are ordered by localSeq, so one transaction's events are adjacent.
    while (index < events.length && events[index]!.txId === txId) {
      group.push(events[index]!);
      index++;
    }

    if (current.length > 0 && current.length + group.length > size) {
      batches.push(current);
      current = [];
    }

    current.push(...group);

    if (current.length >= size) {
      batches.push(current);
      current = [];
    }
  }

  if (current.length > 0) batches.push(current);

  return batches;
}

/**
 * Pushes due outbox events in batches. Each batch's result is persisted before
 * the next is sent, so a failure part-way through keeps the progress already
 * made instead of restarting from zero.
 */
export async function pushOutbox(args: PushArgs): Promise<PushOutcome> {
  const { outbox, push, batchSize, now, log } = args;

  const due = [...outbox.state.values()].filter((entry) => isDue(entry, now)).sort(byLocalSeq);

  log.debug("push outbox", { dueCount: due.length, batchSize });

  if (due.length === 0) return { pushed: 0, deadLettered: 0 };

  let pushed = 0;
  let deadLettered = 0;

  for (const batch of batchByTransaction(due, batchSize)) {
    const attempted: OutboxEntry[] = [];

    for (const entry of batch) {
      const attemptCount = (entry.attemptCount ?? 0) + 1;

      await outbox.update(entry.eventId, (draft) => {
        draft.syncStatus = "pending";
        draft.attemptCount = attemptCount;
        draft.lastAttemptAt = now;
        draft.nextAttemptAt = null;
        draft.lastError = null;
        draft.lastErrorCode = null;
        draft.retryable = null;
      }).isPersisted.promise;

      attempted.push({ ...entry, attemptCount });
    }

    let response;
    try {
      response = normalizePushResponse(await push(attempted.map(toOutboundEvent)));
    } catch (err) {
      // Transport-level failure: nothing in this batch was acknowledged, so back
      // every event off together and stop. Batches already confirmed stay synced.
      deadLettered += await backoffBatch(args, attempted, err);
      const error = err instanceof Error ? err : new Error(String(err));
      log.warn("push stopped after transport failure", {
        message: error.message,
        pushed,
        remaining: due.length - pushed,
      });
      return { pushed, deadLettered, error };
    }

    log.info("push batch confirmed", {
      sent: attempted.length,
      confirmed: response.confirmed.length,
      failed: response.failed?.length ?? 0,
    });

    for (const confirmation of response.confirmed) {
      if (!outbox.has(confirmation.eventId)) continue;

      await outbox.update(confirmation.eventId, (draft) => {
        draft.sync = true;
        draft.syncStatus = "synced";
        draft.globalSeq = confirmation.globalSeq;
        draft.nextAttemptAt = null;
        draft.lastError = null;
        draft.lastErrorCode = null;
        draft.retryable = null;
      }).isPersisted.promise;

      pushed++;
      args.emit("onEventPushed", {
        eventId: confirmation.eventId,
        globalSeq: confirmation.globalSeq,
      });
    }

    const byId = new Map(attempted.map((entry) => [entry.eventId, entry]));

    for (const failure of response.failed ?? []) {
      const entry = byId.get(failure.eventId);
      if (!entry) continue;

      deadLettered += await handleFailure(args, entry, failure);
    }
  }

  return { pushed, deadLettered };
}

/** Returns 1 when the event was dead-lettered, 0 when it stays queued for retry. */
async function handleFailure(
  args: PushArgs,
  entry: OutboxEntry,
  failure: PushFailure,
): Promise<number> {
  const { outbox, deadletter, rowversions, retry, now, emit, log } = args;
  const code = failure.code ?? null;

  if (failure.retryable !== true) {
    const reason: DeadLetterReason = code === CONFLICT_ERROR_CODE ? "conflict" : "rejected";
    await deadLetter(
      deadletter,
      outbox,
      entry,
      reason,
      failure.message,
      code,
      now,
      emit,
      log,
      rowversions,
    );
    return 1;
  }

  if (entry.attemptCount >= retry.maxAttempts) {
    await deadLetter(
      deadletter,
      outbox,
      entry,
      "maxAttemptsExceeded",
      failure.message,
      code,
      now,
      emit,
      log,
      rowversions,
    );
    return 1;
  }

  const delay = backoffDelay(entry.attemptCount, retry);

  await outbox.update(entry.eventId, (draft) => {
    draft.sync = false;
    draft.syncStatus = "failed";
    draft.retryable = true;
    draft.lastError = failure.message;
    draft.lastErrorCode = code;
    draft.nextAttemptAt = now + delay;
  }).isPersisted.promise;

  log.warn("push retry scheduled", {
    eventId: entry.eventId,
    attemptCount: entry.attemptCount,
    retryInMs: delay,
    message: failure.message,
  });

  return 0;
}

/** Applies retry backoff to a whole batch after a transport-level failure. */
async function backoffBatch(
  args: PushArgs,
  batch: ReadonlyArray<OutboxEntry>,
  err: unknown,
): Promise<number> {
  const message = err instanceof Error ? err.message : String(err);
  let deadLettered = 0;

  for (const entry of batch) {
    deadLettered += await handleFailure(args, entry, {
      eventId: entry.eventId,
      message,
      retryable: true,
    });
  }

  return deadLettered;
}
