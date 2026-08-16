/**
 * Serializes async work so overlapping callers run one after another instead of
 * concurrently. Used to stop two `sync()` calls from reading the same pending
 * set and pushing it twice.
 *
 * A rejected job does not stall the queue: the next caller still runs.
 *
 * @example Overlapping syncs run in order
 * ```ts
 * import { createSerialQueue } from "./serial-queue"
 *
 * const runExclusive = createSerialQueue()
 *
 * const first = runExclusive(async () => {
 *   await pushPending()
 *   return "first"
 * })
 * const second = runExclusive(async () => {
 *   await pushPending()
 *   return "second"
 * })
 *
 * await Promise.all([first, second]) // "first" finishes before "second" starts
 * ```
 */
export function createSerialQueue(): <T>(fn: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve();

  return <T>(fn: () => Promise<T>): Promise<T> => {
    const result = tail.then(fn, fn);
    tail = result.catch(() => undefined);
    return result;
  };
}
