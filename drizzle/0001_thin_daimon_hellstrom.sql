CREATE TABLE `procurement_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerOpenId` varchar(64) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'complete',
	`requestData` text NOT NULL,
	`resultData` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `procurement_requests_id` PRIMARY KEY(`id`)
);
