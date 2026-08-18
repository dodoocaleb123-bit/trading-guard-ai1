CREATE TABLE `strategy_decision_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`asset` varchar(32) NOT NULL,
	`timeframe` varchar(16) NOT NULL,
	`verdict` enum('APPROVED','DENIED') NOT NULL,
	`confidence` decimal(5,2) NOT NULL,
	`confluenceScore` decimal(5,2) NOT NULL DEFAULT '0',
	`ruleEvidence` mediumtext,
	`ruleFindings` mediumtext,
	`marketSnapshot` mediumtext,
	`generatedDirection` enum('BUY','SELL'),
	`generatedEntry` decimal(18,8),
	`generatedStopLoss` decimal(18,8),
	`generatedTakeProfit` decimal(18,8),
	`decisionReason` text,
	`cooldownKey` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `strategy_decision_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `app_settings` ADD `setupCooldownMinutes` int DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `app_settings` ADD `strategyEngineStatus` enum('AVAILABLE','UNAVAILABLE','NOT_RUN') DEFAULT 'NOT_RUN' NOT NULL;--> statement-breakpoint
ALTER TABLE `app_settings` ADD `strategyEngineLastRunAt` timestamp;--> statement-breakpoint
ALTER TABLE `app_settings` ADD `strategyEngineLastError` text;