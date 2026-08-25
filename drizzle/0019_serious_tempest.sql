ALTER TABLE `scanner_run_ledger` ADD `duplicateCallbacks` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `scanner_run_ledger` ADD `lastDuplicateAt` timestamp;