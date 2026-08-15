import { describe, expect, it, vi } from "vitest";

import { createLazySingleton } from "../lazy-singleton";

type Box = { value: number; greet: () => string };

function makeBox(value: number): Box {
  return { value, greet: () => `value:${value}` };
}

describe("createLazySingleton", () => {
  it("runs the factory once across concurrent ensure() calls", async () => {
    const factory = vi.fn(async () => makeBox(1));
    const singleton = createLazySingleton(factory);

    const [a, b] = await Promise.all([singleton.ensure(), singleton.ensure()]);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it("returns the cached instance on subsequent ensure() calls", async () => {
    const factory = vi.fn(async () => makeBox(2));
    const singleton = createLazySingleton(factory);

    const first = await singleton.ensure();
    const second = await singleton.ensure();

    expect(factory).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it("throws when the proxy is used before initialization", () => {
    const singleton = createLazySingleton(async () => makeBox(3), {
      notInitializedMessage: "not ready",
    });

    expect(() => singleton.proxy.value).toThrow("not ready");
  });

  it("forwards property access and method calls through the proxy after init", async () => {
    const singleton = createLazySingleton(async () => makeBox(4));

    await singleton.ensure();

    expect(singleton.proxy.value).toBe(4);
    expect(singleton.proxy.greet()).toBe("value:4");
    expect("value" in singleton.proxy).toBe(true);
  });

  it("invokes the guard on every ensure() call", async () => {
    const guard = vi.fn();
    const singleton = createLazySingleton(async () => makeBox(5), { guard });

    await singleton.ensure();
    await singleton.ensure();

    expect(guard).toHaveBeenCalledTimes(2);
  });

  it("propagates guard failures without running the factory", async () => {
    const factory = vi.fn(async () => makeBox(6));
    const singleton = createLazySingleton(factory, {
      guard: () => {
        throw new Error("blocked");
      },
    });

    await expect(singleton.ensure()).rejects.toThrow("blocked");
    expect(factory).not.toHaveBeenCalled();
  });

  it("allows retrying after a failed factory run", async () => {
    const factory = vi
      .fn<() => Promise<Box>>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(makeBox(7));
    const singleton = createLazySingleton(factory);

    await expect(singleton.ensure()).rejects.toThrow("boom");
    const instance = await singleton.ensure();

    expect(factory).toHaveBeenCalledTimes(2);
    expect(instance.value).toBe(7);
  });

  it("re-initializes after reset()", async () => {
    const factory = vi
      .fn<() => Promise<Box>>()
      .mockResolvedValueOnce(makeBox(8))
      .mockResolvedValueOnce(makeBox(9));
    const singleton = createLazySingleton(factory);

    const first = await singleton.ensure();
    singleton.reset();
    const second = await singleton.ensure();

    expect(factory).toHaveBeenCalledTimes(2);
    expect(first.value).toBe(8);
    expect(second.value).toBe(9);
    expect(() => singleton.proxy.value).not.toThrow();
  });
});
