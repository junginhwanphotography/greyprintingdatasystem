CREATE TABLE `camera_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `camera_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `film_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`formatId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`iso` varchar(32),
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `film_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `formats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lensGroupId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `formats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lens_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cameraTypeId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lens_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paper_brands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filmTypeId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paper_brands_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paper_sizes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paperTypeId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paper_sizes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paper_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paperBrandId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paper_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `print_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paperSizeId` int NOT NULL,
	`exposureTime` varchar(64),
	`aperture` varchar(32),
	`filterYellow` varchar(16),
	`filterMagenta` varchar(16),
	`filterCyan` varchar(16),
	`developer` varchar(255),
	`developmentTime` varchar(64),
	`temperature` varchar(32),
	`dilution` varchar(64),
	`enlargerHeight` varchar(64),
	`testStrip` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `print_data_id` PRIMARY KEY(`id`),
	CONSTRAINT `print_data_paperSizeId_unique` UNIQUE(`paperSizeId`)
);
