/// <reference lib="webworker" />
import type { OutboundEvent, PullResponse, PushResponse } from "event-sourced-collection";

type PushMsg = {
  id: string;
  type: "push";
  url: string;
  headers: Record<string, string>;
  events: ReadonlyArray<OutboundEvent>;
};

type PullMsg = {
  id: string;
  type: "pull";
  url: string;
  headers: Record<string, string>;
  since: number;
};

type Request = PushMsg | PullMsg;
type Success = { id: string; ok: true; result: PushResponse | PullResponse };
type Failure = { id: string; ok: false; error: string };

self.onmessage = async (event: MessageEvent<Request>) => {
  const msg = event.data;

  try {
    if (msg.type === "push") {
      const response = await fetch(msg.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...msg.headers },
        body: JSON.stringify(msg.events),
      });
      if (!response.ok) {
        throw new Error(`Push failed with HTTP ${response.status}`);
      }
      const result = (await response.json()) as PushResponse;
      const reply: Success = { id: msg.id, ok: true, result };
      self.postMessage(reply);
      return;
    }

    const pullUrl = new URL(msg.url, self.location.origin);
    pullUrl.searchParams.set("since", String(msg.since));

    const response = await fetch(pullUrl, {
      headers: { Accept: "application/json", ...msg.headers },
    });
    if (!response.ok) {
      throw new Error(`Pull failed with HTTP ${response.status}`);
    }

    const result = (await response.json()) as PullResponse;
    const reply: Success = { id: msg.id, ok: true, result };
    self.postMessage(reply);
  } catch (error) {
    const reply: Failure = {
      id: msg.id,
      ok: false,
      error: error instanceof Error ? error.message : "Sync worker error",
    };
    self.postMessage(reply);
  }
};

export {};
