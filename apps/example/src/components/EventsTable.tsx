type ExplorerEvent = {
  localSeq: number;
  globalSeq: number | null;
  eventId: string;
  collectionId: string;
  type: "insert" | "update" | "delete";
  key: string | number;
  payload: Record<string, string | number | boolean | null>;
  timestamp: number;
  syncStatus: "pending" | "synced";
};

type EventsTableProps = {
  events: ExplorerEvent[];
  pendingCount: number;
  showPendingOnly: boolean;
  onTogglePendingOnly: () => void;
  onSelect: (event: ExplorerEvent) => void;
  onDelete: (event: ExplorerEvent) => Promise<void>;
};

export function EventsTable({
  events,
  pendingCount,
  showPendingOnly,
  onTogglePendingOnly,
  onSelect,
  onDelete,
}: EventsTableProps) {
  const rows = showPendingOnly ? events.filter((event) => event.syncStatus === "pending") : events;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-100">Event log</h2>
          <p className="text-sm text-gray-500">
            {pendingCount} pending sync · click a row to inspect payload
          </p>
        </div>
        <button
          type="button"
          onClick={onTogglePendingOnly}
          className={`rounded-lg border px-3 py-2 text-sm ${
            showPendingOnly
              ? "border-amber-700 bg-amber-950/40 text-amber-200"
              : "border-gray-700 text-gray-300 hover:bg-gray-800"
          }`}
        >
          {showPendingOnly ? "Showing pending only" : "Filter pending"}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-800 px-6 py-12 text-center text-sm text-gray-500">
          {showPendingOnly ? "No pending events." : "No events recorded yet."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800 bg-gray-900">
              <tr>
                {["Event", "Collection", "Type", "Key", "Status", "Created", ""].map((header) => (
                  <th
                    key={header || "actions"}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {rows.map((event) => (
                <tr
                  key={event.eventId}
                  className="cursor-pointer hover:bg-gray-900/60"
                  onClick={() => onSelect(event)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {event.eventId.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-gray-400">{event.collectionId}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-indigo-950 px-2 py-0.5 text-xs font-medium text-indigo-300">
                      {event.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {String(event.key).slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        event.syncStatus === "synced" ? "text-emerald-400" : "text-amber-400"
                      }
                    >
                      {event.syncStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        void onDelete(event);
                      }}
                      className="rounded-md border border-red-900 px-2 py-1 text-xs text-red-300 hover:bg-red-950/40"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
