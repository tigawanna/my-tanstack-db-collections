# Web Worker sync transport

Offload `push` / `pull` network + JSON work to a Dedicated Worker so large sync batches do not hitch the UI thread.

SQLite/OPFS I/O is already handled by `@tanstack/browser-db-sqlite-persistence`'s OPFS worker. This example only moves the HTTP transport.

## Files

| File                              | Role                                                         |
| --------------------------------- | ------------------------------------------------------------ |
| `sync.worker.ts`                  | Worker entry — `fetch` + JSON                                |
| `create-worker-sync-transport.ts` | Main-thread `SyncTransport` over `postMessage`               |
| `collections.snippet.ts`          | How to pass the transport into `createBrowserEventSourcedDB` |

Copy these into your app (for example `src/data-access-layer/`), then pass `sync` from `createWorkerSyncTransport(...)` instead of inline `pushEvents` / `pullEvents`.

Keep calling `db.sync()` / `db.manualSync()` on the main thread so outbox confirmations and inbox replay stay on the reactive collections.
