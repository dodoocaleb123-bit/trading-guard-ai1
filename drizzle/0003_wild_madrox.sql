CREATE TABLE `telegram_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`signalId` int,
	`auditTradeId` int,
	`kind` enum('SIGNAL','AUDIT','OUTCOME') NOT NULL,
	`status` enum('DELIVERED','FAILED') NOT NULL,
	`telegramMessageId` varchar(64),
	`dedupeKey` varchar(255) NOT NULL,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`deliveredAt` timestamp,
	CONSTRAINT `telegram_deliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegram_deliveries_dedupeKey_unique` UNIQUE(`dedupeKey`)
);
