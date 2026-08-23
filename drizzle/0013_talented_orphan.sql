CREATE TABLE `paper_trade_adjustments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`signalId` int NOT NULL,
	`asset` varchar(32) NOT NULL,
	`timeframe` varchar(16) NOT NULL,
	`originalDirection` enum('BUY','SELL') NOT NULL,
	`observedDirection` enum('BUY','SELL') NOT NULL,
	`currentPrice` decimal(18,8) NOT NULL,
	`confidence` decimal(5,2) NOT NULL,
	`confluenceScore` decimal(5,2) NOT NULL,
	`action` enum('REVIEW_DIRECTION','TIGHTEN_STOP','EXIT_PAPER_SETUP') NOT NULL,
	`reason` text NOT NULL,
	`evidenceJson` mediumtext NOT NULL,
	`dedupeKey` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paper_trade_adjustments_id` PRIMARY KEY(`id`),
	CONSTRAINT `paper_trade_adjustments_dedupeKey_unique` UNIQUE(`dedupeKey`)
);
--> statement-breakpoint
ALTER TABLE `telegram_deliveries` MODIFY COLUMN `kind` enum('SIGNAL','AUDIT','OUTCOME','SUMMARY','REASON','ADJUSTMENT') NOT NULL;