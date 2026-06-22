import { Hono } from "hono";
import type { OutboundEvent } from "@tanstack-db-collections/event-sourced";
import { remotePullEvents, remotePushEvents } from "./remote";

const app = new Hono().basePath("/api/sync");

app.get("/events", async (c) => {
  const since = Number.parseInt(c.req.query("since") ?? "0", 10);
  const result = await remotePullEvents(Number.isNaN(since) ? 0 : since);
  return c.json(result);
});

app.post("/events", async (c) => {
  const incoming = (await c.req.json()) as OutboundEvent[];
  if (!Array.isArray(incoming)) {
    return c.json({ error: "Expected an array of events" }, 400);
  }

  const confirmed = await remotePushEvents(incoming);
  return c.json({ confirmed });
});

export default app;
