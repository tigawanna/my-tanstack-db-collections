/**
 * Serializes async work so overlapping callers run one after another instead of
 * concurrently. Used to stop two `sync()` calls from reading the same pending
 * set and pushing it twice.
 */
export function createSerialQueue(): <T>(fn: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve();

  return <T>(fn: () => Promise<T>): Promise<T> => {
    const result = tail.then(fn, fn);
    tail = result.catch(() => undefined);
    return result;
  };
}
