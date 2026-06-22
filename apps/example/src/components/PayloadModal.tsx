import { Modal } from "@/components/Modal";

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

type PayloadModalProps = {
  open: boolean;
  event: ExplorerEvent | null;
  onClose: () => void;
};

export function PayloadModal({ open, event, onClose }: PayloadModalProps) {
  if (!event) {
    return null;
  }

  return (
    <Modal title="Event payload" open={open} onClose={onClose}>
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Event ID</dt>
            <dd className="mt-1 font-mono text-xs text-gray-300">{event.eventId}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Type</dt>
            <dd className="mt-1 text-gray-300">{event.type}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Collection</dt>
            <dd className="mt-1 text-gray-300">{event.collectionId}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Sync status</dt>
            <dd className="mt-1 text-gray-300">{event.syncStatus}</dd>
          </div>
        </dl>

        <pre className="overflow-x-auto rounded-lg border border-gray-800 bg-gray-950 p-4 text-xs text-emerald-300">
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      </div>
    </Modal>
  );
}
