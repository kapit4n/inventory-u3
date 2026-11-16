CREATE TYPE "public"."sales_checkpoint_period" AS ENUM('MORNING', 'EVENING');--> statement-breakpoint
CREATE TYPE "public"."sales_checkpoint_status" AS ENUM('DRAFT', 'CONFIRMED', 'CORRECTED');--> statement-breakpoint
CREATE TYPE "public"."sales_checkpoint_weight_basis" AS ENUM('ESTIMATED', 'MEASURED', 'NOT_APPLICABLE');--> statement-breakpoint
CREATE TABLE "sales_checkpoint_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"checkpoint_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_kind" "product_kind" NOT NULL,
	"unit_id" uuid NOT NULL,
	"quantity_milli" integer NOT NULL,
	"presentation_id" uuid,
	"tray_count" integer,
	"average_weight_per_tray_grams" integer,
	"estimated_weight_grams" integer,
	"measured_weight_grams" integer,
	"weight_basis" "sales_checkpoint_weight_basis" NOT NULL,
	"selling_price_amount_minor" integer NOT NULL,
	"selling_price_basis" "product_price_basis" NOT NULL,
	"selling_price_currency" text NOT NULL,
	"estimated_sales_value_minor" integer NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"business_date" date NOT NULL,
	"period" "sales_checkpoint_period" NOT NULL,
	"status" "sales_checkpoint_status" NOT NULL,
	"registered_by_user_id" uuid NOT NULL,
	"note" text,
	"confirmed_by_user_id" uuid,
	"confirmed_at" timestamp with time zone,
	"corrected_by_user_id" uuid,
	"corrected_at" timestamp with time zone,
	"correction_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales_checkpoint_items" ADD CONSTRAINT "sales_checkpoint_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_checkpoint_items" ADD CONSTRAINT "sales_checkpoint_items_checkpoint_id_sales_checkpoints_id_fk" FOREIGN KEY ("checkpoint_id") REFERENCES "public"."sales_checkpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_checkpoint_items" ADD CONSTRAINT "sales_checkpoint_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_checkpoint_items" ADD CONSTRAINT "sales_checkpoint_items_unit_id_measurement_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."measurement_units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_checkpoint_items" ADD CONSTRAINT "sales_checkpoint_items_presentation_id_product_presentations_id_fk" FOREIGN KEY ("presentation_id") REFERENCES "public"."product_presentations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_checkpoints" ADD CONSTRAINT "sales_checkpoints_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_checkpoints" ADD CONSTRAINT "sales_checkpoints_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_checkpoints" ADD CONSTRAINT "sales_checkpoints_registered_by_user_id_users_id_fk" FOREIGN KEY ("registered_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_checkpoints" ADD CONSTRAINT "sales_checkpoints_confirmed_by_user_id_users_id_fk" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_checkpoints" ADD CONSTRAINT "sales_checkpoints_corrected_by_user_id_users_id_fk" FOREIGN KEY ("corrected_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sales_checkpoint_items_organization_checkpoint_idx" ON "sales_checkpoint_items" USING btree ("organization_id","checkpoint_id");--> statement-breakpoint
CREATE INDEX "sales_checkpoint_items_organization_product_idx" ON "sales_checkpoint_items" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_checkpoints_organization_branch_date_period_uq" ON "sales_checkpoints" USING btree ("organization_id","branch_id","business_date","period");--> statement-breakpoint
CREATE INDEX "sales_checkpoints_organization_business_date_idx" ON "sales_checkpoints" USING btree ("organization_id","business_date","created_at");--> statement-breakpoint
CREATE INDEX "sales_checkpoints_organization_branch_idx" ON "sales_checkpoints" USING btree ("organization_id","branch_id");--> statement-breakpoint
CREATE INDEX "sales_checkpoints_organization_status_idx" ON "sales_checkpoints" USING btree ("organization_id","status");