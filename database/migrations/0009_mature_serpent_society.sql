CREATE TYPE "public"."stock_adjustment_kind" AS ENUM('MANUAL', 'RECONCILIATION');--> statement-breakpoint
CREATE TABLE "inventory_waste" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_milli" integer NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by_user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"kind" "stock_adjustment_kind" NOT NULL,
	"quantity_delta_milli" integer NOT NULL,
	"reason" text NOT NULL,
	"expected_quantity_milli" integer,
	"counted_quantity_milli" integer,
	"note" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by_user_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stock_movements" RENAME COLUMN "quantity_delta" TO "quantity_delta_milli";--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "quantity_delta_milli" TYPE integer USING round("quantity_delta_milli" * 1000)::integer;--> statement-breakpoint
ALTER TABLE "inventory_waste" ADD CONSTRAINT "inventory_waste_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_waste" ADD CONSTRAINT "inventory_waste_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_waste" ADD CONSTRAINT "inventory_waste_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_waste" ADD CONSTRAINT "inventory_waste_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_waste_organization_branch_occurred_idx" ON "inventory_waste" USING btree ("organization_id","branch_id","occurred_at");--> statement-breakpoint
CREATE INDEX "inventory_waste_organization_product_idx" ON "inventory_waste" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "stock_adjustments_organization_branch_occurred_idx" ON "stock_adjustments" USING btree ("organization_id","branch_id","occurred_at");--> statement-breakpoint
CREATE INDEX "stock_adjustments_organization_product_idx" ON "stock_adjustments" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "stock_movements_organization_branch_product_idx" ON "stock_movements" USING btree ("organization_id","branch_id","product_id");