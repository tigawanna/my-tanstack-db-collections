CREATE TABLE `sync_backend` (
	`id` integer PRIMARY KEY NOT NULL,
	`backend_id` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `sync_events` ADD `schema_version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_sync_events_row` ON `sync_events` (`collection_id`,`key`,`global_seq`);