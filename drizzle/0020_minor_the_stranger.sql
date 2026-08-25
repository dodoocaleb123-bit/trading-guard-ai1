ALTER TABLE `telegram_deliveries` ADD `retryCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `telegram_deliveries` ADD `lastRetryAt` timestamp;