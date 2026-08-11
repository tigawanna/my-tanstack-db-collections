# Example app

Reference implementation for `event-sourced-collection` in a TanStack Start browser app.

## Run

From the monorepo root:

```bash
pnpm install
pnpm --filter event-sourced-collection build
pnpm --filter example dev
```

Open [http://localhost:3091](http://localhost:3091).

## Project layout

| Path                                         | Role                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/data-access-layer/collections.ts`       | Types, sync transport, `createBrowserEventSourcedDB` → exports `ensureDb` + `db` |
| `src/data-access-layer/sync-events.ts`       | `syncEvents()` and `manualSyncEvents()` wrappers                                 |
| `src/hooks/common/use-event-sourced-sync.ts` | Background sync every 60s via React Query                                        |
| `src/routes/_dashboard/layout.tsx`           | Calls `ensureDb()` before rendering; waits for first sync                        |
| `src/routes/_dashboard/events/`              | Outbox/inbox inspector with **Sync now**                                         |
| `src/routes/api/sync/events.ts`              | Server push/pull API (`POST` + `GET ?since=`)                                    |
| `src/server/sync/remote.ts`                  | Drizzle persistence for the server event log                                     |

## How the client is wired

`collections.ts` uses the recommended one-call setup:

```typescript
import { createBrowserEventSourcedDB } from "event-sourced-collection/browser";

const { ensureDb, db } = createBrowserEventSourcedDB<AppCollectionDefs>({
  databaseName: "my-app.sqlite",
  debug: import.meta.env.DEV,
  collections: {
    users: { getKey: (user) => user.id },
    todos: { getKey: (todo) => todo.id },
    settings: { getKey: (settings) => settings.id },
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

- **`load`** — dynamic imports keep platform code out of SSR bundles; you pick `@tanstack/react-db` here.
- **`ensureDb()`** — call once at app startup (see dashboard layout).
- **`db`** — import anywhere after init; proxy forwards to the singleton.

## Sync flow in this app

1. User mutates `db.collections.todos` → row appended to local **outbox** (`sync: false`).
2. `manualSync()` or background hook pushes outbox → `POST /api/sync/events`.
3. Server assigns `globalSeq` → outbox rows flip to `sync: true`.
4. Pull fetches newer events → `GET /api/sync/events?since=<cursor>`.
5. Remote events land in **inbox**, replay into collections, flip to `sync: true`.

Use the **Events** page (`/events`) to inspect outbox and inbox. **Sync now** is in the page header and works from either tab.

## Simulate another device

POST a fake event directly to the server (unique `eventId` required):

```bash
curl -X POST http://localhost:3091/api/sync/events \
  -H "Content-Type: application/json" \
  -d '[{
    "eventId": "019c0000-0000-7000-8000-remote-demo",
    "collectionId": "todos",
    "type": "insert",
    "key": "remote-todo-demo",
    "payload": {
      "id": "remote-todo-demo",
      "userId": "remote-user",
      "title": "From another device",
      "status": "pending",
      "createdAt": 1730000000000,
      "updatedAt": 1730000000000
    },
    "timestamp": 1730000000000
  }]'
```

Then click **Sync now** on `/events` or wait for the background sync. The event appears in inbox and the todo shows up locally.

Check server state:

```bash
curl "http://localhost:3091/api/sync/events?since=0"
```

## Further reading

- Package docs: [packages/event-sourced-collection/README.md](../../packages/event-sourced-collection/README.md)
- Design decisions: [packages/event-sourced-collection/ARCHITECTURE.md](../../packages/event-sourced-collection/ARCHITECTURE.md)
