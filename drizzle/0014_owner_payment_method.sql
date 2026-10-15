CREATE TYPE "public"."payment_method" AS ENUM('BANK_TRANSFER', 'CASH_PICKUP', 'CASH_DELIVERY');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method" "payment_method";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_instructions_draft" varchar(500);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method_updated_at" timestamp with time zone;