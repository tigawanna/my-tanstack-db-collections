# locally-first

A collection of typescriptlocal-first tools including event sourced approach using tanstack db and drizzle

## Packages

| Package                                                           | Description                                      |
| ----------------------------------------------------------------- | ------------------------------------------------ |
| [`event-sourced-collection`](./packages/event-sourced-collection) | Event-sourced local-first DB on TanStack DB      |
| [`event-sourced-drizzle`](./packages/event-sourced-drizzle)       | Drizzle ORM sync engine with inbox/outbox tables |
| [`@repo/typescript-config`](./packages/typescript-config)         | Shared TypeScript config                         |

## Apps

| App                         | Description                                                  |
| --------------------------- | ------------------------------------------------------------ |
| [`example`](./apps/example) | TanStack Start demo: todos, outbox/inbox UI, server sync API |

Call `ensureDb()` once when your app mounts, then use `db.collections.*` and `db.sync()` as normal.

Full guide: [packages/event-sourced-collection/README.md](./packages/event-sourced-collection/README.md)

## Scripts

```bash
pnpm build          # build all packages/apps
pnpm dev            # dev all (turbo)
pnpm test           # run tests (all packages)
pnpm check-types    # typecheck all
```

Build or test a single package:

```bash
pnpm --filter event-sourced-collection test
pnpm --filter event-sourced-drizzle test
pnpm --filter example check-types
```
