import { openBrowserWASQLiteOPFSDatabase } from "@tanstack/browser-db-sqlite-persistence";

export const database = await openBrowserWASQLiteOPFSDatabase({
  databaseName: "my-app.sqlite",
});
