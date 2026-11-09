CREATE TABLE `measurement_units` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`organization_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `measurement_units_organization_code_uq` ON `measurement_units` (`organization_id`,`code`);--> statement-breakpoint
CREATE INDEX `measurement_units_organization_active_idx` ON `measurement_units` (`organization_id`,`is_active`);--> statement-breakpoint
CREATE TABLE `product_categories` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_categories_organization_name_uq` ON `product_categories` (`organization_id`,`name`);--> statement-breakpoint
CREATE INDEX `product_categories_organization_active_idx` ON `product_categories` (`organization_id`,`is_active`);--> statement-breakpoint
CREATE TABLE `product_presentations` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`organization_id` text NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_presentations_product_name_uq` ON `product_presentations` (`product_id`,`name`);--> statement-breakpoint
CREATE INDEX `product_presentations_product_active_idx` ON `product_presentations` (`product_id`,`is_active`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`organization_id` text NOT NULL,
	`category_id` text NOT NULL,
	`name` text NOT NULL,
	`inventory_unit_id` text NOT NULL,
	`sales_unit_id` text NOT NULL,
	`purchase_unit_id` text,
	`production_unit_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`inventory_unit_id`) REFERENCES `measurement_units`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`sales_unit_id`) REFERENCES `measurement_units`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`purchase_unit_id`) REFERENCES `measurement_units`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`production_unit_id`) REFERENCES `measurement_units`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `products_organization_active_idx` ON `products` (`organization_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `products_organization_category_idx` ON `products` (`organization_id`,`category_id`);