CREATE TABLE `white_ai_memories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`memoryType` enum('CONVERSATION','PREFERENCE','LEARNING') NOT NULL DEFAULT 'CONVERSATION',
	`content` varchar(1200) NOT NULL,
	`sourceMessageId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `white_ai_memories_id` PRIMARY KEY(`id`)
);
