export type LazySingletonOptions = {
  guard?: () => void;
  notInitializedMessage?: string;
};

export type LazySingleton<T extends object> = {
  ensure: () => Promise<T>;
  proxy: T;
  reset: () => void;
};

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
