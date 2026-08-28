CREATE TABLE `v5_zone_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`asset` varchar(32) NOT NULL,
	`timeframe` varchar(16) NOT NULL,
	`zoneKey` varchar(255) NOT NULL,
	`zoneKind` enum('SUPPLY','DEMAND') NOT NULL,
	`lower` decimal(24,10) NOT NULL,
	`upper` decimal(24,10) NOT NULL,
	`reactions` int NOT NULL DEFAULT 0,
	`displacement` decimal(24,10) NOT NULL DEFAULT '0',
	`fresh` boolean NOT NULL DEFAULT true,
	`weakFor` varchar(32) NOT NULL DEFAULT '',
	`lifecycle` enum('ACTIVE','WEAKENED','INVALIDATED') NOT NULL DEFAULT 'ACTIVE',
	`observationCount` int NOT NULL DEFAULT 1,
	`retestCount` int NOT NULL DEFAULT 0,
	`firstSeenAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`lastCandleAt` timestamp,
	`lastRetestedAt` timestamp,
	`evidenceJson` mediumtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `v5_zone_history_id` PRIMARY KEY(`id`),
	CONSTRAINT `v5_zone_history_identity_unique` UNIQUE(`userId`,`asset`,`timeframe`,`zoneKey`)
);
--> statement-breakpoint
CREATE INDEX `v5_zone_history_asset_timeframe_idx` ON `v5_zone_history` (`userId`,`asset`,`timeframe`);--> statement-breakpoint
CREATE INDEX `v5_zone_history_lifecycle_idx` ON `v5_zone_history` (`userId`,`lifecycle`);