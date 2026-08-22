CREATE TABLE `entry_locator_states` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`asset` varchar(32) NOT NULL,
	`timeframe` varchar(16) NOT NULL,
	`status` enum('WAITING','READY','EMITTED') NOT NULL DEFAULT 'WAITING',
	`snapshotCount` int NOT NULL DEFAULT 0,
	`lastSnapshotAt` timestamp,
	`lastDirection` enum('BUY','SELL'),
	`lastConfidence` decimal(5,2),
	`lastConfluence` decimal(5,2),
	`evidenceJson` mediumtext,
	`conflictJson` mediumtext,
	`stateJson` mediumtext,
	`lastEmittedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `entry_locator_states_id` PRIMARY KEY(`id`)
);
