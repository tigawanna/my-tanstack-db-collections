import { describe, expect, it, vi } from "vitest";

import { createBrowserEventSourcedDB } from "../platforms/browser-event-sourced-db";
import type { BrowserEventSourcedModules } from "../platforms/browser-event-sourced-db";
import {
  createFakePersistence,
  fakeCreateCollection,
  fakePersistedCollectionOptions,
} from "./fake-collection";

type Todo = { id: string; title: string };

type TodoDefs = { todos: { getKey: (todo: Todo) => string } };

const collections: TodoDefs = { todos: { getKey: (todo: Todo) => todo.id } };

function createModules() {
  const persistence = createFakePersistence();
  const coordinatorDispose = vi.fn();
  const databaseClose = vi.fn();

  const modules = vi.fn(async (): Promise<BrowserEventSourcedModules> => {
    return {
      openBrowserWASQLiteOPFSDatabase: async () => ({
        execute: async () => [],
        close: databaseClose,
      }),
      createBrowserWASQLitePersistence: () => persistence,
      BrowserCollectionCoordinator: class {
        readonly dispose = coordinatorDispose;
        constructor(_options: unknown) {}
      },
      createCollection: fakeCreateCollection,
      persistedCollectionOptions: fakePersistedCollectionOptions,
    } as unknown as BrowserEventSourcedModules;
  });

  return { modules, coordinatorDispose, databaseClose };
}

describe("createBrowserEventSourcedDB", () => {
  it("initializes the database once and exposes user and reserved collections", async () => {
    vi.stubGlobal("window", {});
    const { modules } = createModules();

    const { ensureDb, db } = createBrowserEventSourcedDB<TodoDefs>({
      databaseName: "test.sqlite",
      collections,
      modules,
    });

    const database = await ensureDb();

    expect(modules).toHaveBeenCalledTimes(1);
    expect(database.collections.todos).toBeDefined();
    expect(database.collections.outbox).toBeDefined();
    expect(database.collections.inbox).toBeDefined();

    await db.collections.todos.insert({ id: "t1", title: "A" }).isPersisted.promise;
    expect([...db.collections.todos.state.values()]).toHaveLength(1);
  });

  it("deduplicates concurrent ensureDb calls", async () => {
    vi.stubGlobal("window", {});
    const { modules } = createModules();

    const { ensureDb } = createBrowserEventSourcedDB<TodoDefs>({
      databaseName: "test.sqlite",
      collections,
      modules,
    });

    await Promise.all([ensureDb(), ensureDb()]);

    expect(modules).toHaveBeenCalledTimes(1);
  });

  it("throws when db is accessed before ensureDb", () => {
    vi.stubGlobal("window", {});
    const { modules } = createModules();

    const { db } = createBrowserEventSourcedDB<TodoDefs>({
      databaseName: "test.sqlite",
      collections,
      modules,
    });

    expect(() => db.collections).toThrow(/Call ensureDb/);
  });

  it("closes the platform and re-initializes on the next ensureDb", async () => {
    vi.stubGlobal("window", {});
    const { modules, coordinatorDispose, databaseClose } = createModules();

    const { ensureDb, close } = createBrowserEventSourcedDB<TodoDefs>({
      databaseName: "test.sqlite",
      collections,
      modules,
    });

    await ensureDb();
    await close();

    expect(coordinatorDispose).toHaveBeenCalledTimes(1);
    expect(databaseClose).toHaveBeenCalledTimes(1);

    await ensureDb();
    expect(modules).toHaveBeenCalledTimes(2);
  });

  it("rejects initialization outside a browser environment", async () => {
    const { modules } = createModules();

    const { ensureDb } = createBrowserEventSourcedDB<TodoDefs>({
      databaseName: "test.sqlite",
      collections,
      modules,
    });

    await expect(ensureDb()).rejects.toThrow(/browser environment/);
    expect(modules).not.toHaveBeenCalled();
  });
});
