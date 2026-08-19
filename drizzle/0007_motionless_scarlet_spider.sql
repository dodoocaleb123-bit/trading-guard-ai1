ALTER TABLE `app_settings` ADD `strategyEngineTotalSnapshots` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `app_settings` ADD `strategyEngineCompleteResponses` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `app_settings` ADD `strategyEngineRetryCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `app_settings` ADD `strategyEngineUnavailableCycles` int DEFAULT 0 NOT NULL;