import type { EventSourcedHooks } from "../core/types";
import type { EventSourcedLogger } from "../utils/logger";

/**
 * Invokes a lifecycle hook. A hook that throws is logged and swallowed — user
 * observation code must never be able to fail a sync.
 *
 * @example
 * ```ts
 * const emit: EmitHook = createHookEmitter(
 *   { onSyncStart: ({ trigger }) => console.info("sync", trigger) },
 *   log,
 * )
 *
 * emit("onSyncStart", { trigger: "manualSync" })
 * emit("onDeadLetter", deadLetterEntry) // no-op when that hook is omitted
 * ```
 */
export type EmitHook = <TName extends keyof EventSourcedHooks>(
  name: TName,
  argument: Parameters<NonNullable<EventSourcedHooks[TName]>>[0],
) => void;

/**
 * Builds an {@link EmitHook} bound to the user-supplied {@link EventSourcedHooks}.
 *
 * @example A throwing hook is logged, then ignored
 * ```ts
 * import { createHookEmitter } from "./hooks"
 *
 * const emit = createHookEmitter(
 *   {
 *     onDeadLetter: () => {
 *       throw new Error("toast failed")
 *     },
 *   },
 *   log,
 * )
 *
 * emit("onDeadLetter", entry) // sync continues; log.error("lifecycle hook threw", …)
 * ```
 */
export function createHookEmitter(
  hooks: EventSourcedHooks | undefined,
  log: EventSourcedLogger,
): EmitHook {
  if (!hooks) return () => {};

  return (name, argument) => {
    const hook = hooks[name] as ((value: unknown) => void) | undefined;
    if (!hook) return;

    try {
      hook(argument);
    } catch (err) {
      log.error("lifecycle hook threw", {
        hook: name,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };
}
