CREATE TYPE "public"."daily_closing_cost_basis" AS ENUM('LATEST_PURCHASE_PRICE', 'UNAVAILABLE');--> statement-breakpoint
CREATE TYPE "public"."daily_closing_status" AS ENUM('DRAFT', 'REVIEWED', 'CONFIRMED', 'REOPENED');--> statement-breakpoint
CREATE TABLE "daily_closing_items" (
	"organization_id" uuid NOT NULL,
	"daily_closing_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_kind" "product_kind" NOT NULL,
	"unit_id" uuid NOT NULL,
	"opening_quantity_milli" integer NOT NULL,
	"purchased_quantity_milli" integer NOT NULL,
	"produced_quantity_milli" integer NOT NULL,
	"sold_quantity_milli" integer NOT NULL,
	"waste_quantity_milli" integer NOT NULL,
	"adjustment_quantity_milli" integer NOT NULL,
	"correction_quantity_milli" integer NOT NULL,
	"reconciliation_difference_quantity_milli" integer NOT NULL,
	"closing_quantity_milli" integer NOT NULL,
	"estimated_revenue_minor" integer NOT NULL,
	"unit_cost_amount_minor" integer,
	"cost_basis" "daily_closing_cost_basis" NOT NULL,
	"estimated_cost_of_sales_minor" integer NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_closing_items_daily_closing_id_product_id_pk" PRIMARY KEY("daily_closing_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "daily_closings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"business_date" date NOT NULL,
	"version" integer NOT NULL,
	"previous_closing_id" uuid,
	"status" "daily_closing_status" NOT NULL,
	"currency" text NOT NULL,
	"purchases_total_minor" integer NOT NULL,
	"purchase_count" integer NOT NULL,
	"unreceived_purchase_count" integer NOT NULL,
	"production_batch_count" integer NOT NULL,
	"production_draft_count" integer NOT NULL,
	"production_tray_count" integer NOT NULL,
	"production_estimated_weight_grams" integer NOT NULL,
	"sales_checkpoint_count" integer NOT NULL,
	"draft_sales_checkpoint_count" integer NOT NULL,
	"sales_total_minor" integer NOT NULL,
	"waste_record_count" integer NOT NULL,
	"inventory_difference_product_count" integer NOT NULL,
	"estimated_revenue_minor" integer NOT NULL,
	"estimated_cost_minor" integer NOT NULL,
	"estimated_gross_profit_minor" integer NOT NULL,
	"missing_cost_product_count" integer NOT NULL,
	"negative_stock_product_count" integer NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"confirmed_by_user_id" uuid,
	"confirmed_at" timestamp with time zone,
	"reopened_by_user_id" uuid,
	"reopened_at" timestamp with time zone,
	"reopen_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_closing_items" ADD CONSTRAINT "daily_closing_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closing_items" ADD CONSTRAINT "daily_closing_items_daily_closing_id_daily_closings_id_fk" FOREIGN KEY ("daily_closing_id") REFERENCES "public"."daily_closings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closing_items" ADD CONSTRAINT "daily_closing_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closing_items" ADD CONSTRAINT "daily_closing_items_unit_id_measurement_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."measurement_units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_previous_closing_id_daily_closings_id_fk" FOREIGN KEY ("previous_closing_id") REFERENCES "public"."daily_closings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_confirmed_by_user_id_users_id_fk" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_reopened_by_user_id_users_id_fk" FOREIGN KEY ("reopened_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_closing_items_organization_closing_idx" ON "daily_closing_items" USING btree ("organization_id","daily_closing_id");--> statement-breakpoint
CREATE INDEX "daily_closing_items_organization_product_idx" ON "daily_closing_items" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_closings_organization_branch_date_version_uq" ON "daily_closings" USING btree ("organization_id","branch_id","business_date","version");--> statement-breakpoint
CREATE INDEX "daily_closings_organization_business_date_idx" ON "daily_closings" USING btree ("organization_id","business_date","created_at");--> statement-breakpoint
CREATE INDEX "daily_closings_organization_branch_idx" ON "daily_closings" USING btree ("organization_id","branch_id");--> statement-breakpoint
CREATE INDEX "daily_closings_organization_status_idx" ON "daily_closings" USING btree ("organization_id","status");