ALTER TYPE "public"."stock_movement_source_type" ADD VALUE 'PURCHASE_CORRECTION' BEFORE 'PRODUCTION_BATCH';--> statement-breakpoint
DROP INDEX "purchase_corrections_organization_purchase_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_corrections_organization_purchase_uq" ON "purchase_corrections" USING btree ("organization_id","purchase_id");