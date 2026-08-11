export function getSyncDatabaseUrl(): string {
  return process.env["SYNC_DATABASE_URL"] ?? process.env["DATABASE_URL"] ?? "file:./sync-server.db";
}

export function getSyncDatabaseAuthToken(): string | undefined {
  return process.env["SYNC_DATABASE_AUTH_TOKEN"] ?? process.env["DATABASE_AUTH_TOKEN"];
}
