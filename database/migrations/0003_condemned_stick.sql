CREATE TYPE "public"."product_kind" AS ENUM('RAW', 'PROCESSED');--> statement-breakpoint
ALTER TABLE "product_presentations" ADD COLUMN "average_weight_grams" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "kind" "product_kind" NOT NULL;