ALTER TABLE `product_presentations` ADD `average_weight_grams` integer NOT NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_products` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`organization_id` text NOT NULL,
	`category_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
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
	FOREIGN KEY (`production_unit_id`) REFERENCES `measurement_units`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "products_kind_in_values" CHECK("kind" in ('RAW', 'PROCESSED'))
);
--> statement-breakpoint
INSERT INTO `__new_products`("id", "organization_id", "category_id", "name", "inventory_unit_id", "sales_unit_id", "purchase_unit_id", "production_unit_id", "is_active", "created_at", "updated_at") SELECT "id", "organization_id", "category_id", "name", "inventory_unit_id", "sales_unit_id", "purchase_unit_id", "production_unit_id", "is_active", "created_at", "updated_at" FROM `products`;--> statement-breakpoint
DROP TABLE `products`;--> statement-breakpoint
ALTER TABLE `__new_products` RENAME TO `products`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `products_organization_active_idx` ON `products` (`organization_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `products_organization_category_idx` ON `products` (`organization_id`,`category_id`);