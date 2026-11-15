CREATE TABLE `inventory_waste` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`organization_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity_milli` integer NOT NULL,
	`reason` text NOT NULL,
	`note` text,
	`occurred_at` integer NOT NULL,
	`recorded_at` integer NOT NULL,
	`recorded_by_user_id` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `inventory_waste_organization_branch_occurred_idx` ON `inventory_waste` (`organization_id`,`branch_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `inventory_waste_organization_product_idx` ON `inventory_waste` (`organization_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `stock_adjustments` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`organization_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`product_id` text NOT NULL,
	`kind` text NOT NULL,
	`quantity_delta_milli` integer NOT NULL,
	`reason` text NOT NULL,
	`expected_quantity_milli` integer,
	`counted_quantity_milli` integer,
	`note` text,
	`occurred_at` integer NOT NULL,
	`recorded_at` integer NOT NULL,
	`recorded_by_user_id` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "stock_adjustments_kind_in_values" CHECK("kind" in ('MANUAL', 'RECONCILIATION'))
);
--> statement-breakpoint
CREATE INDEX `stock_adjustments_organization_branch_occurred_idx` ON `stock_adjustments` (`organization_id`,`branch_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `stock_adjustments_organization_product_idx` ON `stock_adjustments` (`organization_id`,`product_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_stock_movements` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`organization_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity_delta_milli` integer NOT NULL,
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
	CONSTRAINT "stock_movements_source_type_in_values" CHECK("source_type" in ('PURCHASE_RECEIPT', 'PURCHASE_CORRECTION', 'PRODUCTION_BATCH', 'SALES_CHECKPOINT', 'ADJUSTMENT', 'WASTE_REPORT'))
);
--> statement-breakpoint
INSERT INTO `__new_stock_movements`("id", "organization_id", "branch_id", "product_id", "quantity_delta_milli", "reason", "source_type", "source_id", "corrects_movement_id", "occurred_at", "recorded_at", "recorded_by_user_id", "note") SELECT "id", "organization_id", "branch_id", "product_id", CAST(ROUND("quantity_delta" * 1000) AS INTEGER), "reason", "source_type", "source_id", "corrects_movement_id", "occurred_at", "recorded_at", "recorded_by_user_id", "note" FROM `stock_movements`;--> statement-breakpoint
DROP TABLE `stock_movements`;--> statement-breakpoint
ALTER TABLE `__new_stock_movements` RENAME TO `stock_movements`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `stock_movements_organization_branch_idx` ON `stock_movements` (`organization_id`,`branch_id`);--> statement-breakpoint
CREATE INDEX `stock_movements_organization_source_idx` ON `stock_movements` (`organization_id`,`source_type`,`source_id`);--> statement-breakpoint
CREATE INDEX `stock_movements_organization_product_occurred_idx` ON `stock_movements` (`organization_id`,`product_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `stock_movements_organization_branch_product_idx` ON `stock_movements` (`organization_id`,`branch_id`,`product_id`);