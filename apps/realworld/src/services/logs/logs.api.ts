import type { EvlogLogsResponse } from "@/types/evlog";

async function parseError(response: Response): Promise<Error> {
  try {
    const body = (await response.json()) as { message?: string };
    return new Error(body.message ?? `Request failed (${response.status})`);
  } catch {
    return new Error(`Request failed (${response.status})`);
  }
}

export async function fetchEvlogDates(): Promise<string[]> {
  const response = await fetch("/api/logs/?listDates=1");
  if (!response.ok) throw await parseError(response);
  const payload = (await response.json()) as { dates: string[] };
  return payload.dates;
}

export type FetchEvlogLogsParams = {
  date: string;
  page: number;
  pageSize: number;
};

export async function fetchEvlogLogs(params: FetchEvlogLogsParams): Promise<EvlogLogsResponse> {
  const search = new URLSearchParams({
    date: params.date,
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  const response = await fetch(`/api/logs/?${search.toString()}`);
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<EvlogLogsResponse>;
}
