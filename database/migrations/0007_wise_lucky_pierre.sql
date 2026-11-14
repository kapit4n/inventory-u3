CREATE TYPE "public"."purchase_status" AS ENUM('DRAFT', 'RECEIVED', 'CANCELLED', 'CORRECTED');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_reason" AS ENUM('RECEIVING', 'PRODUCTION_INPUT', 'PRODUCTION_OUTPUT', 'SALES_CHECKPOINT', 'ADJUSTMENT', 'WASTE', 'CORRECTION');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_source_type" AS ENUM('PURCHASE_RECEIPT', 'PRODUCTION_BATCH', 'SALES_CHECKPOINT', 'ADJUSTMENT', 'WASTE_REPORT');--> statement-breakpoint
CREATE TABLE "purchase_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"purchase_id" uuid NOT NULL,
	"corrected_by_user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"before_total_minor" integer NOT NULL,
	"after_total_minor" integer NOT NULL,
	"corrected_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"purchase_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"quantity_milli" integer NOT NULL,
	"unit_price_minor" integer NOT NULL,
	"line_total_minor" integer NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"status" "purchase_status" NOT NULL,
	"delivery_date" date NOT NULL,
	"currency" text NOT NULL,
	"total_minor" integer NOT NULL,
	"note" text,
	"created_by_user_id" uuid NOT NULL,
	"received_by_user_id" uuid,
	"received_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"corrected_by_user_id" uuid,
	"corrected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_delta" double precision NOT NULL,
	"reason" "stock_movement_reason" NOT NULL,
	"source_type" "stock_movement_source_type",
	"source_id" text,
	"corrects_movement_id" uuid,
	"occurred_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by_user_id" uuid NOT NULL,
	"note" text
);
--> statement-breakpoint
ALTER TABLE "purchase_corrections" ADD CONSTRAINT "purchase_corrections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_corrections" ADD CONSTRAINT "purchase_corrections_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_corrections" ADD CONSTRAINT "purchase_corrections_corrected_by_user_id_users_id_fk" FOREIGN KEY ("corrected_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_unit_id_measurement_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."measurement_units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_received_by_user_id_users_id_fk" FOREIGN KEY ("received_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_corrected_by_user_id_users_id_fk" FOREIGN KEY ("corrected_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_corrects_movement_id_stock_movements_id_fk" FOREIGN KEY ("corrects_movement_id") REFERENCES "public"."stock_movements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "purchase_corrections_organization_purchase_idx" ON "purchase_corrections" USING btree ("organization_id","purchase_id");--> statement-breakpoint
CREATE INDEX "purchase_items_organization_purchase_idx" ON "purchase_items" USING btree ("organization_id","purchase_id");--> statement-breakpoint
CREATE INDEX "purchase_items_organization_product_idx" ON "purchase_items" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "purchases_organization_delivery_idx" ON "purchases" USING btree ("organization_id","delivery_date","created_at");--> statement-breakpoint
CREATE INDEX "purchases_organization_branch_idx" ON "purchases" USING btree ("organization_id","branch_id");--> statement-breakpoint
CREATE INDEX "purchases_organization_supplier_idx" ON "purchases" USING btree ("organization_id","supplier_id");--> statement-breakpoint
CREATE INDEX "purchases_organization_status_idx" ON "purchases" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "stock_movements_organization_branch_idx" ON "stock_movements" USING btree ("organization_id","branch_id");--> statement-breakpoint
CREATE INDEX "stock_movements_organization_source_idx" ON "stock_movements" USING btree ("organization_id","source_type","source_id");--> statement-breakpoint
CREATE INDEX "stock_movements_organization_product_occurred_idx" ON "stock_movements" USING btree ("organization_id","product_id","occurred_at");