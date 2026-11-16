CREATE TYPE "public"."production_status" AS ENUM('DRAFT', 'CONFIRMED', 'CORRECTED');--> statement-breakpoint
CREATE TYPE "public"."production_weight_basis" AS ENUM('ESTIMATED', 'MEASURED');--> statement-breakpoint
CREATE TABLE "production_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"business_date" date NOT NULL,
	"prepared_by_employee_id" uuid NOT NULL,
	"registered_by_user_id" uuid NOT NULL,
	"status" "production_status" NOT NULL,
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
CREATE TABLE "production_inputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"quantity_milli" integer NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_outputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"presentation_id" uuid NOT NULL,
	"tray_count" integer NOT NULL,
	"average_weight_per_tray_grams" integer NOT NULL,
	"estimated_weight_grams" integer NOT NULL,
	"measured_weight_grams" integer,
	"weight_basis" "production_weight_basis" NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_waste" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_milli" integer NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_prepared_by_employee_id_employees_id_fk" FOREIGN KEY ("prepared_by_employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_registered_by_user_id_users_id_fk" FOREIGN KEY ("registered_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_confirmed_by_user_id_users_id_fk" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_corrected_by_user_id_users_id_fk" FOREIGN KEY ("corrected_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_inputs" ADD CONSTRAINT "production_inputs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_inputs" ADD CONSTRAINT "production_inputs_batch_id_production_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."production_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_inputs" ADD CONSTRAINT "production_inputs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_inputs" ADD CONSTRAINT "production_inputs_unit_id_measurement_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."measurement_units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_outputs" ADD CONSTRAINT "production_outputs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_outputs" ADD CONSTRAINT "production_outputs_batch_id_production_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."production_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_outputs" ADD CONSTRAINT "production_outputs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_outputs" ADD CONSTRAINT "production_outputs_presentation_id_product_presentations_id_fk" FOREIGN KEY ("presentation_id") REFERENCES "public"."product_presentations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_waste" ADD CONSTRAINT "production_waste_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_waste" ADD CONSTRAINT "production_waste_batch_id_production_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."production_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_waste" ADD CONSTRAINT "production_waste_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "production_batches_organization_business_date_idx" ON "production_batches" USING btree ("organization_id","business_date","created_at");--> statement-breakpoint
CREATE INDEX "production_batches_organization_branch_idx" ON "production_batches" USING btree ("organization_id","branch_id");--> statement-breakpoint
CREATE INDEX "production_batches_organization_employee_idx" ON "production_batches" USING btree ("organization_id","prepared_by_employee_id");--> statement-breakpoint
CREATE INDEX "production_batches_organization_status_idx" ON "production_batches" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "production_inputs_organization_batch_idx" ON "production_inputs" USING btree ("organization_id","batch_id");--> statement-breakpoint
CREATE INDEX "production_inputs_organization_product_idx" ON "production_inputs" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "production_outputs_organization_batch_idx" ON "production_outputs" USING btree ("organization_id","batch_id");--> statement-breakpoint
CREATE INDEX "production_outputs_organization_product_idx" ON "production_outputs" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "production_waste_organization_batch_idx" ON "production_waste" USING btree ("organization_id","batch_id");--> statement-breakpoint
CREATE INDEX "production_waste_organization_product_idx" ON "production_waste" USING btree ("organization_id","product_id");