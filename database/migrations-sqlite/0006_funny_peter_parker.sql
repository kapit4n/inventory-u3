CREATE TABLE `product_price_history` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`organization_id` text NOT NULL,
	`product_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`price_basis` text NOT NULL,
	`effective_from` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "product_price_history_basis_in_values" CHECK("price_basis" in ('PER_KILOGRAM', 'PER_SALES_UNIT'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_price_history_product_effective_uq` ON `product_price_history` (`product_id`,`effective_from`);--> statement-breakpoint
CREATE INDEX `product_price_history_organization_product_effective_idx` ON `product_price_history` (`organization_id`,`product_id`,`effective_from`);