import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { desc, eq } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { db } from '../db/client'
import { events } from '../db/schema'
import type { Event } from '../db/schema'

const getEvents = createServerFn({ method: 'GET' }).handler(() =>
  db.select().from(events).orderBy(desc(events.createdAt)).limit(50),
)

const appendEvent = createServerFn({ method: 'POST' })
  .validator((raw: unknown) => {
    if (
      typeof raw !== 'object' ||
      raw === null ||
      typeof (raw as Record<string, unknown>)['aggregateId'] !== 'string' ||
      typeof (raw as Record<string, unknown>)['type'] !== 'string'
    ) {
      throw new Error('Invalid event payload')
    }
    return raw as { aggregateId: string; type: string; payload: Record<string, unknown> }
  })
  .handler(async ({ data }) => {
    const [latest] = await db
      .select({ version: events.version })
      .from(events)
      .where(eq(events.aggregateId, data.aggregateId))
      .orderBy(desc(events.version))
      .limit(1)

    await db.insert(events).values({
      id: uuidv7(),
      aggregateId: data.aggregateId,
      type: data.type,
      payload: JSON.stringify(data.payload),
      version: (latest?.version ?? 0) + 1,
      createdAt: new Date(),
    })
  })

export const Route = createFileRoute('/')({
  loader: () => getEvents(),
  component: Home,
})

function Home() {
  const router = useRouter()
  const eventList = Route.useLoaderData()

  async function handleAppend() {
    await appendEvent({
      data: {
        aggregateId: uuidv7(),
        type: 'TodoCreated',
        payload: { title: `Task created at ${new Date().toISOString()}`, completed: false },
      },
    })
    await router.invalidate()
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Event Store Explorer</h1>
            <p className="mt-1 text-sm text-gray-400">
              TanStack Start · Drizzle ORM · libSQL (local Turso)
            </p>
          </div>
          <button
            onClick={handleAppend}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold transition-colors hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
          >
            Append Event
          </button>
        </header>

        <EventTable events={eventList} />
      </div>
    </div>
  )
}

function EventTable({ events: rows }: { events: Event[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 px-6 py-16 text-center">
        <p className="text-sm text-gray-500">
          No events yet — click <span className="text-gray-300">Append Event</span> to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-800 bg-gray-900">
          <tr>
            {['ID', 'Type', 'Aggregate ID', 'v', 'Created'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {rows.map((event) => (
            <tr key={event.id} className="hover:bg-gray-900/50">
              <td className="px-4 py-3 font-mono text-xs text-gray-500">
                {event.id.slice(0, 8)}&hellip;
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-indigo-950 px-2 py-0.5 text-xs font-medium text-indigo-300">
                  {event.type}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-500">
                {event.aggregateId.slice(0, 8)}&hellip;
              </td>
              <td className="px-4 py-3 tabular-nums text-gray-300">{event.version}</td>
              <td className="px-4 py-3 text-gray-400">
                {event.createdAt instanceof Date
                  ? event.createdAt.toLocaleString()
                  : String(event.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
