CREATE TABLE `sales_checkpoint_items` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`organization_id` text NOT NULL,
	`checkpoint_id` text NOT NULL,
	`product_id` text NOT NULL,
	`product_kind` text NOT NULL,
	`unit_id` text NOT NULL,
	`quantity_milli` integer NOT NULL,
	`presentation_id` text,
	`tray_count` integer,
	`average_weight_per_tray_grams` integer,
	`estimated_weight_grams` integer,
	`measured_weight_grams` integer,
	`weight_basis` text NOT NULL,
	`selling_price_amount_minor` integer NOT NULL,
	`selling_price_basis` text NOT NULL,
	`selling_price_currency` text NOT NULL,
	`estimated_sales_value_minor` integer NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`checkpoint_id`) REFERENCES `sales_checkpoints`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`unit_id`) REFERENCES `measurement_units`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`presentation_id`) REFERENCES `product_presentations`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "sales_checkpoint_items_product_kind_in_values" CHECK("product_kind" in ('RAW', 'PROCESSED')),
	CONSTRAINT "sales_checkpoint_items_weight_basis_in_values" CHECK("weight_basis" in ('ESTIMATED', 'MEASURED', 'NOT_APPLICABLE')),
	CONSTRAINT "sales_checkpoint_items_selling_price_basis_in_values" CHECK("selling_price_basis" in ('PER_KILOGRAM', 'PER_SALES_UNIT'))
);
--> statement-breakpoint
CREATE INDEX `sales_checkpoint_items_organization_checkpoint_idx` ON `sales_checkpoint_items` (`organization_id`,`checkpoint_id`);--> statement-breakpoint
CREATE INDEX `sales_checkpoint_items_organization_product_idx` ON `sales_checkpoint_items` (`organization_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `sales_checkpoints` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`organization_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`business_date` text NOT NULL,
	`period` text NOT NULL,
	`status` text NOT NULL,
	`registered_by_user_id` text NOT NULL,
	`note` text,
	`confirmed_by_user_id` text,
	`confirmed_at` integer,
	`corrected_by_user_id` text,
	`corrected_at` integer,
	`correction_reason` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`registered_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`confirmed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`corrected_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "sales_checkpoints_period_in_values" CHECK("period" in ('MORNING', 'EVENING')),
	CONSTRAINT "sales_checkpoints_status_in_values" CHECK("status" in ('DRAFT', 'CONFIRMED', 'CORRECTED'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_checkpoints_organization_branch_date_period_uq` ON `sales_checkpoints` (`organization_id`,`branch_id`,`business_date`,`period`);--> statement-breakpoint
CREATE INDEX `sales_checkpoints_organization_business_date_idx` ON `sales_checkpoints` (`organization_id`,`business_date`,`created_at`);--> statement-breakpoint
CREATE INDEX `sales_checkpoints_organization_branch_idx` ON `sales_checkpoints` (`organization_id`,`branch_id`);--> statement-breakpoint
CREATE INDEX `sales_checkpoints_organization_status_idx` ON `sales_checkpoints` (`organization_id`,`status`);