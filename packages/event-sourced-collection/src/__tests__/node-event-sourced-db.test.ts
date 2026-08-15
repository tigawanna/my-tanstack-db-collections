import { describe, expect, it, vi } from "vitest";

import { createNodeEventSourcedDB } from "../platforms/node-event-sourced-db";
import {
  createFakePersistence,
  fakeCreateCollection,
  fakePersistedCollectionOptions,
} from "./fake-collection";

type Todo = { id: string; title: string };

type TodoDefs = { todos: { getKey: (todo: Todo) => string } };

const collections: TodoDefs = { todos: { getKey: (todo: Todo) => todo.id } };

describe("createNodeEventSourcedDB", () => {
  it("accepts node persistence modules without a load callback", async () => {
    const persistence = createFakePersistence();
    const close = vi.fn();
    const createNodeSQLitePersistence = vi.fn(() => persistence);

    const { ensureDb, db } = createNodeEventSourcedDB<TodoDefs>({
      collections,
      modules: {
        database: { close },
        createNodeSQLitePersistence,
        createCollection: fakeCreateCollection,
        persistedCollectionOptions: fakePersistedCollectionOptions,
      },
    });

    const database = await ensureDb();

    expect(createNodeSQLitePersistence).toHaveBeenCalledTimes(1);
    expect(database.collections.todos).toBeDefined();

    await db.collections.todos.insert({ id: "t1", title: "A" }).isPersisted.promise;
    expect([...db.collections.todos.state.values()]).toHaveLength(1);
  });

  it("closes the sqlite database on close()", async () => {
    const persistence = createFakePersistence();
    const close = vi.fn();

    const { ensureDb, close: closeDb } = createNodeEventSourcedDB<TodoDefs>({
      collections,
      modules: {
        database: { close },
        createNodeSQLitePersistence: () => persistence,
        createCollection: fakeCreateCollection,
        persistedCollectionOptions: fakePersistedCollectionOptions,
      },
    });

    await ensureDb();
    await closeDb();

    expect(close).toHaveBeenCalledTimes(1);
  });
});
