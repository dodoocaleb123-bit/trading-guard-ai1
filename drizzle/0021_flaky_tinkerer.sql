CREATE TABLE `entry_forger_states` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`asset` varchar(32) NOT NULL,
	`timeframe` varchar(16) NOT NULL,
	`status` enum('WAITING','READY','EMITTED','REJECTED') NOT NULL DEFAULT 'WAITING',
	`snapshotCount` int NOT NULL DEFAULT 0,
	`lastSnapshotAt` timestamp,
	`lastDirection` enum('BUY','SELL'),
	`lastConfidence` decimal(5,2),
	`lastConfluence` decimal(5,2),
	`reason` text,
	`targetBoundary` decimal(24,10),
	`targetDistance` decimal(24,10),
	`riskReward` decimal(5,2),
	`stateJson` mediumtext,
	`lastEmittedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `entry_forger_states_id` PRIMARY KEY(`id`),
	CONSTRAINT `entry_forger_states_user_asset_timeframe_unique` UNIQUE(`userId`,`asset`,`timeframe`)
);
--> statement-breakpoint
CREATE INDEX `entry_forger_states_updated_at_idx` ON `entry_forger_states` (`updatedAt`);