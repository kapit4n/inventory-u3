CREATE TABLE `purchase_corrections` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`organization_id` text NOT NULL,
	`purchase_id` text NOT NULL,
	`corrected_by_user_id` text NOT NULL,
	`reason` text NOT NULL,
	`before_total_minor` integer NOT NULL,
	`after_total_minor` integer NOT NULL,
	`corrected_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`corrected_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `purchase_corrections_organization_purchase_idx` ON `purchase_corrections` (`organization_id`,`purchase_id`);--> statement-breakpoint
CREATE TABLE `purchase_items` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`organization_id` text NOT NULL,
	`purchase_id` text NOT NULL,
	`product_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`quantity_milli` integer NOT NULL,
	`unit_price_minor` integer NOT NULL,
	`line_total_minor` integer NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`unit_id`) REFERENCES `measurement_units`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `purchase_items_organization_purchase_idx` ON `purchase_items` (`organization_id`,`purchase_id`);--> statement-breakpoint
CREATE INDEX `purchase_items_organization_product_idx` ON `purchase_items` (`organization_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`organization_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`supplier_id` text NOT NULL,
	`status` text NOT NULL,
	`delivery_date` text NOT NULL,
	`currency` text NOT NULL,
	`total_minor` integer NOT NULL,
	`note` text,
	`created_by_user_id` text NOT NULL,
	`received_by_user_id` text,
	`received_at` integer,
	`cancelled_at` integer,
	`corrected_by_user_id` text,
	`corrected_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`received_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`corrected_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "purchases_status_in_values" CHECK("status" in ('DRAFT', 'RECEIVED', 'CANCELLED', 'CORRECTED'))
);
--> statement-breakpoint
CREATE INDEX `purchases_organization_delivery_idx` ON `purchases` (`organization_id`,`delivery_date`,`created_at`);--> statement-breakpoint
CREATE INDEX `purchases_organization_branch_idx` ON `purchases` (`organization_id`,`branch_id`);--> statement-breakpoint
CREATE INDEX `purchases_organization_supplier_idx` ON `purchases` (`organization_id`,`supplier_id`);--> statement-breakpoint
CREATE INDEX `purchases_organization_status_idx` ON `purchases` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`organization_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity_delta` real NOT NULL,
	`reason` text NOT NULL,
	`source_type` text,
	`source_id` text,
	`corrects_movement_id` text,
	`occurred_at` integer NOT NULL,
	`recorded_at` integer NOT NULL,
	`recorded_by_user_id` text NOT NULL,
	`note` text,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`corrects_movement_id`) REFERENCES `stock_movements`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "stock_movements_reason_in_values" CHECK("reason" in ('RECEIVING', 'PRODUCTION_INPUT', 'PRODUCTION_OUTPUT', 'SALES_CHECKPOINT', 'ADJUSTMENT', 'WASTE', 'CORRECTION')),
	CONSTRAINT "stock_movements_source_type_in_values" CHECK("source_type" in ('PURCHASE_RECEIPT', 'PRODUCTION_BATCH', 'SALES_CHECKPOINT', 'ADJUSTMENT', 'WASTE_REPORT'))
);
--> statement-breakpoint
CREATE INDEX `stock_movements_organization_branch_idx` ON `stock_movements` (`organization_id`,`branch_id`);--> statement-breakpoint
CREATE INDEX `stock_movements_organization_source_idx` ON `stock_movements` (`organization_id`,`source_type`,`source_id`);--> statement-breakpoint
CREATE INDEX `stock_movements_organization_product_occurred_idx` ON `stock_movements` (`organization_id`,`product_id`,`occurred_at`);