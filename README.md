# my-tanstack-db-collections

Monorepo for **event-sourced-collection** — a local-first, event-sourced database on TanStack DB — plus a reference example app.

## Packages

| Package                                                           | Description                                                          |
| ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| [`event-sourced-collection`](./packages/event-sourced-collection) | Core library: outbox/inbox sync, browser + React Native entry points |
| [`@repo/typescript-config`](./packages/typescript-config)         | Shared TypeScript config                                             |

## Apps

| App                         | Description                                                  |
| --------------------------- | ------------------------------------------------------------ |
| [`example`](./apps/example) | TanStack Start demo: todos, outbox/inbox UI, server sync API |

## Quick start

```bash
pnpm install
pnpm --filter event-sourced-collection build
pnpm --filter example dev
```

Open [http://localhost:3091](http://localhost:3091).

## Usage (browser)

Recommended setup — one call, platform deps stay in your app via `load`:

```typescript
import { createBrowserEventSourcedDB } from "event-sourced-collection/browser";

const { ensureDb, db } = createBrowserEventSourcedDB({
  databaseName: "my-app.sqlite",
  collections: {
    todos: { getKey: (todo: Todo) => todo.id },
  },
  sync: { pushEvents, pullEvents },
  load: async () => {
    const { createCollection } = await import("@tanstack/react-db");
    const platform = await import("@tanstack/browser-db-sqlite-persistence");
    return { ...platform, createCollection };
  },
});

export { db, ensureDb };
```

Call `ensureDb()` once when your app mounts, then use `db.collections.*` and `db.sync()` as normal.

Full guide: [packages/event-sourced-collection/README.md](./packages/event-sourced-collection/README.md)

Runnable example app: [apps/example/README.md](./apps/example/README.md)

## Scripts

```bash
pnpm build          # build all packages/apps
pnpm dev            # dev all (turbo)
pnpm test           # run tests (event-sourced-collection)
pnpm check-types    # typecheck all
```

Build or test a single package:

```bash
pnpm --filter event-sourced-collection test
pnpm --filter example check-types
```
