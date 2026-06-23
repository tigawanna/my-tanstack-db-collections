CREATE TABLE `sync_events` (
	`global_seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` text NOT NULL,
	`collection_id` text NOT NULL,
	`type` text NOT NULL,
	`key` text NOT NULL,
	`payload` text NOT NULL,
	`client_timestamp` integer NOT NULL,
	`server_timestamp` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sync_events_event_id_unique` ON `sync_events` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_sync_events_global_seq` ON `sync_events` (`global_seq`);