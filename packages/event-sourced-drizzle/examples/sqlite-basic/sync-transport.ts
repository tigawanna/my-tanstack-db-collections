// @ts-nocheck
/**
 * Sync transport — push local events to the server, pull remote events back.
 *
 * This example uses simple fetch calls. Replace the URLs and auth with your
 * actual API.
 */
import type { OutboundEvent, PullResponse, PushResponse } from "event-sourced-drizzle";

const API_BASE = "http://localhost:3000/api/sync";

function getAuthHeaders(): Record<string, string> {
  const token = process.env.API_TOKEN ?? "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function pushEvents(events: ReadonlyArray<OutboundEvent>): Promise<PushResponse> {
  const response = await fetch(`${API_BASE}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(events),
  });
  if (!response.ok) throw new Error(`Push failed: HTTP ${response.status}`);
  return response.json() as Promise<PushResponse>;
}

export async function pullEvents(params: { since: number }): Promise<PullResponse> {
  const response = await fetch(`${API_BASE}/events?since=${params.since}`, {
    headers: { Accept: "application/json", ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error(`Pull failed: HTTP ${response.status}`);
  return response.json() as Promise<PullResponse>;
}
