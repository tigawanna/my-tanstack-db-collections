export type LazySingletonOptions = {
  /** Runs on every `ensure()` / proxy access (e.g. `typeof window` checks). */
  guard?: () => void;
  /** Thrown when `proxy` is used before `ensure()` resolves. */
  notInitializedMessage?: string;
};

/**
 * Result of {@link createLazySingleton}.
 *
 * @example
 * ```ts
 * import { createLazySingleton } from "event-sourced-collection"
 *
 * const { ensure, proxy, reset } = createLazySingleton(async () => ({ ready: true }))
 * await ensure()
 * console.log(proxy.ready) // true
 * reset()
 * ```
 */
export type LazySingleton<T extends object> = {
  ensure: () => Promise<T>;
  proxy: T;
  reset: () => void;
};

/**
 * One-shot async factory with a proxy that is safe to export as a module
 * singleton. Platform DB helpers are built on this.
 *
 * @example Export a proxy, initialize at app startup
 * ```ts
 * import { createLazySingleton } from "event-sourced-collection"
 *
 * type Client = { ping: () => Promise<string> }
 *
 * const { ensure, proxy: client } = createLazySingleton<Client>(async () => ({
 *   ping: async () => "ok",
 * }))
 *
 * export async function start() {
 *   await ensure()
 * }
 *
 * export { client }
 * // client.ping() throws until start() has run
 * ```
 */
export function createLazySingleton<T extends object>(
  factory: () => Promise<T>,
  options: LazySingletonOptions = {},
): LazySingleton<T> {
  let instance: T | null = null;
  let initPromise: Promise<T> | null = null;

  const ensure = async (): Promise<T> => {
    options.guard?.();

    if (instance) {
      return instance;
    }

    if (!initPromise) {
      initPromise = factory()
        .then((resolved) => {
          instance = resolved;
          return resolved;
        })
        .catch((error: unknown) => {
          initPromise = null;
          throw error;
        });
    }

    return initPromise;
  };

  const message =
    options.notInitializedMessage ?? "Instance is not initialized. Call ensure() first.";

  const proxy = new Proxy({} as T, {
    get(_target, prop, receiver) {
      if (!instance) {
        throw new Error(message);
      }
      return Reflect.get(instance, prop, receiver);
    },
    has(_target, prop) {
      if (!instance) {
        throw new Error(message);
      }
      return Reflect.has(instance, prop);
    },
    getPrototypeOf() {
      if (!instance) {
        throw new Error(message);
      }
      return Reflect.getPrototypeOf(instance);
    },
  });

  const reset = (): void => {
    instance = null;
    initPromise = null;
  };

  return { ensure, proxy, reset };
}
