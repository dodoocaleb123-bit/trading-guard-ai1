CREATE TABLE `strategy_intelligence_components` (
	`id` int AUTO_INCREMENT NOT NULL,
	`versionId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`sourceRuleIds` mediumtext NOT NULL,
	`trigger` enum('MARKET_STRUCTURE','MOMENTUM','VOLATILITY','SUPPORT_RESISTANCE','BREAKOUT','CANDLE') NOT NULL,
	`stance` enum('BUY','SELL','NEUTRAL') NOT NULL,
	`conditionJson` mediumtext NOT NULL,
	`weight` decimal(8,3) NOT NULL DEFAULT '1',
	`enabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `strategy_intelligence_components_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `strategy_intelligence_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`versionLabel` varchar(64) NOT NULL,
	`status` enum('DRAFT','VALIDATING','ACTIVE','RETIRED') NOT NULL DEFAULT 'DRAFT',
	`sourceRuleCount` int NOT NULL DEFAULT 0,
	`componentCount` int NOT NULL DEFAULT 0,
	`lessonCount` int NOT NULL DEFAULT 0,
	`algorithmJson` mediumtext NOT NULL,
	`validationJson` mediumtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`activatedAt` timestamp,
	CONSTRAINT `strategy_intelligence_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `strategy_lessons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`signalId` int,
	`sourceVersionId` int,
	`outcome` enum('WIN','LOSS','INVALIDATED') NOT NULL,
	`status` enum('PROPOSED','VALIDATING','ACCEPTED','REJECTED') NOT NULL DEFAULT 'PROPOSED',
	`observation` mediumtext NOT NULL,
	`lessonJson` mediumtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`validatedAt` timestamp,
	CONSTRAINT `strategy_lessons_id` PRIMARY KEY(`id`)
);
