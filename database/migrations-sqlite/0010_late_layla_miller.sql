CREATE TABLE `production_batches` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`organization_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`business_date` text NOT NULL,
	`prepared_by_employee_id` text NOT NULL,
	`registered_by_user_id` text NOT NULL,
	`status` text NOT NULL,
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
	FOREIGN KEY (`prepared_by_employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`registered_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`confirmed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`corrected_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "production_batches_status_in_values" CHECK("status" in ('DRAFT', 'CONFIRMED', 'CORRECTED'))
);
--> statement-breakpoint
CREATE INDEX `production_batches_organization_business_date_idx` ON `production_batches` (`organization_id`,`business_date`,`created_at`);--> statement-breakpoint
CREATE INDEX `production_batches_organization_branch_idx` ON `production_batches` (`organization_id`,`branch_id`);--> statement-breakpoint
CREATE INDEX `production_batches_organization_employee_idx` ON `production_batches` (`organization_id`,`prepared_by_employee_id`);--> statement-breakpoint
CREATE INDEX `production_batches_organization_status_idx` ON `production_batches` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `production_inputs` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`organization_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`product_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`quantity_milli` integer NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`batch_id`) REFERENCES `production_batches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`unit_id`) REFERENCES `measurement_units`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `production_inputs_organization_batch_idx` ON `production_inputs` (`organization_id`,`batch_id`);--> statement-breakpoint
CREATE INDEX `production_inputs_organization_product_idx` ON `production_inputs` (`organization_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `production_outputs` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`organization_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`product_id` text NOT NULL,
	`presentation_id` text NOT NULL,
	`tray_count` integer NOT NULL,
	`average_weight_per_tray_grams` integer NOT NULL,
	`estimated_weight_grams` integer NOT NULL,
	`measured_weight_grams` integer,
	`weight_basis` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`batch_id`) REFERENCES `production_batches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`presentation_id`) REFERENCES `product_presentations`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "production_outputs_weight_basis_in_values" CHECK("weight_basis" in ('ESTIMATED', 'MEASURED'))
);
--> statement-breakpoint
CREATE INDEX `production_outputs_organization_batch_idx` ON `production_outputs` (`organization_id`,`batch_id`);--> statement-breakpoint
CREATE INDEX `production_outputs_organization_product_idx` ON `production_outputs` (`organization_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `production_waste` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`organization_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity_milli` integer NOT NULL,
	`reason` text NOT NULL,
	`note` text,
	`position` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`batch_id`) REFERENCES `production_batches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `production_waste_organization_batch_idx` ON `production_waste` (`organization_id`,`batch_id`);--> statement-breakpoint
CREATE INDEX `production_waste_organization_product_idx` ON `production_waste` (`organization_id`,`product_id`);