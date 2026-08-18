CREATE TABLE `cooldown_change_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`previousMinutes` int NOT NULL,
	`newMinutes` int NOT NULL,
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cooldown_change_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `strategy_decision_ledger` MODIFY COLUMN `verdict` enum('APPROVED','DENIED','SKIPPED','UNAVAILABLE') NOT NULL;