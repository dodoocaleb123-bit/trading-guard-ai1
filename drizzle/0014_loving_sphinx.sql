ALTER TABLE `generated_signals` MODIFY COLUMN `status` enum('PENDING','WIN','LOSS','INVALIDATED','SUPERSEDED') NOT NULL DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE `paper_trade_adjustments` MODIFY COLUMN `action` enum('REVIEW_DIRECTION','TIGHTEN_STOP','EXIT_PAPER_SETUP','UPGRADE_PAPER_SETUP') NOT NULL;--> statement-breakpoint
ALTER TABLE `generated_signals` ADD `supersededBySignalId` int;--> statement-breakpoint
ALTER TABLE `paper_trade_adjustments` ADD `replacementSignalId` int;