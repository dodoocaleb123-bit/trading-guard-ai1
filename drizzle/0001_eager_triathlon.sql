CREATE TABLE `app_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`onboardingComplete` boolean NOT NULL DEFAULT false,
	`scannerEnabled` boolean NOT NULL DEFAULT true,
	`scheduleCronTaskUid` varchar(65),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_settings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `audit_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`verdict` enum('APPROVED','DENIED','PENDING'),
	`confidence` decimal(5,2),
	`asset` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_trades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`messageId` int,
	`asset` varchar(32) NOT NULL,
	`timeframe` varchar(16),
	`direction` enum('BUY','SELL'),
	`entry` decimal(18,8),
	`stopLoss` decimal(18,8),
	`takeProfit` decimal(18,8),
	`verdict` enum('APPROVED','DENIED') NOT NULL,
	`confidence` decimal(5,2),
	`adjustments` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_trades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `generated_signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`asset` varchar(32) NOT NULL,
	`timeframe` varchar(16) NOT NULL,
	`direction` enum('BUY','SELL') NOT NULL,
	`entry` decimal(18,8) NOT NULL,
	`stopLoss` decimal(18,8) NOT NULL,
	`takeProfit` decimal(18,8) NOT NULL,
	`riskReward` decimal(8,2) NOT NULL,
	`confidence` decimal(5,2) NOT NULL,
	`rationale` text,
	`status` enum('PENDING','WIN','LOSS','INVALIDATED') NOT NULL DEFAULT 'PENDING',
	`outcomeNote` text,
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	CONSTRAINT `generated_signals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `strategy_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`sourceType` enum('pdf','docx','text') NOT NULL,
	`sourceFileName` varchar(255),
	`content` text NOT NULL,
	`storageKey` varchar(512),
	`supabaseId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `strategy_rules_id` PRIMARY KEY(`id`)
);
