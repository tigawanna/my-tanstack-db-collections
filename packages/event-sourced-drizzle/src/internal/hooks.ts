import type { EventSourcedLogger } from "../utils/logger";
import type { DeadLetterRow, MutationType, OutboxRow } from "./types";

export type SyncTrigger = "sync" | "manualSync";
export type SyncPhase = "push" | "pull" | "replay";

export type SyncResult = {
  pushed: number;
  pulled: number;
  skipped: number;
  deadLettered: number;
  deferred: boolean;
  errors: Error[];
};

export type ManualSyncResult = SyncResult & {
  replayed: number;
};

export type BackendMismatchPolicy = "resetCursor" | "fail" | "ignore";

export type EventSourcedHooks = {
  onReady?: (context: { clientId: string; pullCursor: number }) => void;
  onMutation?: (entry: OutboxRow) => void;
  onSyncStart?: (context: { trigger: SyncTrigger }) => void;
  onSyncComplete?: (context: { trigger: SyncTrigger; result: SyncResult }) => void;
  onSyncError?: (context: { phase: SyncPhase; error: Error }) => void;
  onEventPushed?: (context: { eventId: string; globalSeq: number }) => void;
  onEventApplied?: (context: {
    eventId: string;
    collectionId: string;
    type: MutationType;
    key: string;
  }) => void;
  onEventSkipped?: (context: { eventId: string; collectionId: string; reason: string }) => void;
  onDeadLetter?: (entry: DeadLetterRow) => void;
  onBackendMismatch?: (context: {
    expected: string | null;
    received: string;
    policy: BackendMismatchPolicy;
  }) => void;
};

/**
 * Loosely-typed hook emitter. Hooks are fire-and-forget: a throw is logged and
 * swallowed so it never breaks a sync.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EmitHook = (hook: keyof EventSourcedHooks, arg: any) => void;

export function createHookEmitter(
  hooks: EventSourcedHooks | undefined,
  log: EventSourcedLogger,
): EmitHook {
  return (hook, arg) => {
    const fn = hooks?.[hook];
    if (!fn) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fn as (a: any) => void)(arg);
    } catch (err) {
      log.warn(`hook "${hook}" threw`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };
}
