CREATE TABLE `certificates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`full_name` text NOT NULL,
	`issued_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `certificates_user_id_unique` ON `certificates` (`user_id`);
