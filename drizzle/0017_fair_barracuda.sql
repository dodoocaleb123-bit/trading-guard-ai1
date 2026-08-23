CREATE TABLE `owner_alert_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`alertType` varchar(64) NOT NULL,
	`dedupeKey` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`notifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `owner_alert_ledger_id` PRIMARY KEY(`id`),
	CONSTRAINT `owner_alert_ledger_dedupeKey_unique` UNIQUE(`dedupeKey`)
);
--> statement-breakpoint
CREATE INDEX `owner_alert_user_type_idx` ON `owner_alert_ledger` (`userId`,`alertType`,`createdAt`);