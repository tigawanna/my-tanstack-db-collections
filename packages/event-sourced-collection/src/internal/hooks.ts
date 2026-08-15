import type { EventSourcedHooks } from "../types";
import type { EventSourcedLogger } from "../utils/logger";

/**
 * Invokes a lifecycle hook. A hook that throws is logged and swallowed — user
 * observation code must never be able to fail a sync.
 */
export type EmitHook = <TName extends keyof EventSourcedHooks>(
  name: TName,
  argument: Parameters<NonNullable<EventSourcedHooks[TName]>>[0],
) => void;

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
