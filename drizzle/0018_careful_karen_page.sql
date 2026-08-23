ALTER TABLE `generated_signals` ADD `resolutionCandleAt` timestamp;--> statement-breakpoint
ALTER TABLE `generated_signals` ADD `resolutionPrice` decimal(18,8);--> statement-breakpoint
ALTER TABLE `generated_signals` ADD `resolutionHigh` decimal(18,8);--> statement-breakpoint
ALTER TABLE `generated_signals` ADD `resolutionLow` decimal(18,8);--> statement-breakpoint
ALTER TABLE `generated_signals` ADD `resolutionUsedIntrabar` boolean;