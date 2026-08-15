import type {
  OutboundEvent,
  PullResponse,
  PushResponse,
  SyncTransport,
} from "event-sourced-collection";

type WorkerSuccess = { id: string; ok: true; result: PushResponse | PullResponse };
type WorkerFailure = { id: string; ok: false; error: string };

/**
 * Bridges a Dedicated Worker that performs HTTP push/pull into a SyncTransport.
 * Keep `db.sync()` / `db.manualSync()` on the main thread so collections stay reactive.
 */
export function createWorkerSyncTransport(options: {
  worker: Worker;
  pushUrl: string;
  pullUrl: string;
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
}): SyncTransport {
  const pending = new Map<
    string,
    {
      resolve: (value: PushResponse | PullResponse) => void;
      reject: (reason: unknown) => void;
    }
  >();

  options.worker.addEventListener(
    "message",
    (event: MessageEvent<WorkerSuccess | WorkerFailure>) => {
      const msg = event.data;
      const entry = pending.get(msg.id);
      if (!entry) {
        return;
      }
      pending.delete(msg.id);
      if (msg.ok) {
        entry.resolve(msg.result);
      } else {
        entry.reject(new Error(msg.error));
      }
    },
  );

  function callWorker<T extends PushResponse | PullResponse>(
    payload: Record<string, unknown>,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      pending.set(id, {
        resolve: resolve as (value: PushResponse | PullResponse) => void,
        reject,
      });
      options.worker.postMessage({ id, ...payload });
    });
  }

  return {
    async push(events: ReadonlyArray<OutboundEvent>) {
      if (events.length === 0) {
        return { confirmed: [] };
      }
      const headers = (await options.getHeaders?.()) ?? {};
      return callWorker<PushResponse>({
        type: "push",
        url: options.pushUrl,
        headers,
        events,
      });
    },
    async pull(since: number) {
      const headers = (await options.getHeaders?.()) ?? {};
      return callWorker<PullResponse>({
        type: "pull",
        url: options.pullUrl,
        headers,
        since,
      });
    },
  };
}
