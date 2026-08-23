CREATE TABLE `scanner_run_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskUid` varchar(65) NOT NULL,
	`runKey` varchar(128) NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`finishedAt` timestamp,
	`status` enum('RUNNING','SUCCEEDED','FAILED') NOT NULL DEFAULT 'RUNNING',
	`usersProcessed` int NOT NULL DEFAULT 0,
	`createdSignals` int NOT NULL DEFAULT 0,
	`trackedSignals` int NOT NULL DEFAULT 0,
	`adjustments` int NOT NULL DEFAULT 0,
	`marketData` enum('available','unavailable','not-run') NOT NULL DEFAULT 'not-run',
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scanner_run_ledger_id` PRIMARY KEY(`id`),
	CONSTRAINT `scanner_run_ledger_run_key_unique` UNIQUE(`runKey`)
);
--> statement-breakpoint
CREATE INDEX `scanner_run_ledger_task_uid_idx` ON `scanner_run_ledger` (`taskUid`);--> statement-breakpoint
CREATE INDEX `scanner_run_ledger_started_at_idx` ON `scanner_run_ledger` (`startedAt`);