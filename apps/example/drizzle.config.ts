import { defineConfig } from "drizzle-kit";
import { getSyncDatabaseAuthToken, getSyncDatabaseUrl } from "./src/server/sync/database-url";

export default defineConfig({
  schema: "./src/server/sync/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: getSyncDatabaseUrl(),
    authToken: getSyncDatabaseAuthToken(),
  },
});
