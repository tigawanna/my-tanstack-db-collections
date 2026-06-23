import { createFsDrain } from "evlog/fs";
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook("evlog:drain", createFsDrain({ maxFiles: 14, pretty: true }));
});
