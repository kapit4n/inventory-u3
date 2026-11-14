PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_stock_movements` (
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
	CONSTRAINT "stock_movements_source_type_in_values" CHECK("source_type" in ('PURCHASE_RECEIPT', 'PURCHASE_CORRECTION', 'PRODUCTION_BATCH', 'SALES_CHECKPOINT', 'ADJUSTMENT', 'WASTE_REPORT'))
);
--> statement-breakpoint
INSERT INTO `__new_stock_movements`("id", "organization_id", "branch_id", "product_id", "quantity_delta", "reason", "source_type", "source_id", "corrects_movement_id", "occurred_at", "recorded_at", "recorded_by_user_id", "note") SELECT "id", "organization_id", "branch_id", "product_id", "quantity_delta", "reason", "source_type", "source_id", "corrects_movement_id", "occurred_at", "recorded_at", "recorded_by_user_id", "note" FROM `stock_movements`;--> statement-breakpoint
DROP TABLE `stock_movements`;--> statement-breakpoint
ALTER TABLE `__new_stock_movements` RENAME TO `stock_movements`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `stock_movements_organization_branch_idx` ON `stock_movements` (`organization_id`,`branch_id`);--> statement-breakpoint
CREATE INDEX `stock_movements_organization_source_idx` ON `stock_movements` (`organization_id`,`source_type`,`source_id`);--> statement-breakpoint
CREATE INDEX `stock_movements_organization_product_occurred_idx` ON `stock_movements` (`organization_id`,`product_id`,`occurred_at`);--> statement-breakpoint
DROP INDEX `purchase_corrections_organization_purchase_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_corrections_organization_purchase_uq` ON `purchase_corrections` (`organization_id`,`purchase_id`);