import { openBrowserWASQLiteOPFSDatabase } from "@tanstack/browser-db-sqlite-persistence";

const database = await openBrowserWASQLiteOPFSDatabase({
  databaseName: "my-app.sqlite",
});
