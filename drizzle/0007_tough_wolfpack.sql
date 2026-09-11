ALTER TABLE "product_images" DROP CONSTRAINT "product_images_storage_key_unique";--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "removed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "cleanup_pending" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "cleanup_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "cleanup_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "last_cleanup_error_code" varchar(100);--> statement-breakpoint
CREATE INDEX "product_images_product_active_idx" ON "product_images" USING btree ("product_id","removed_at","sort_order");--> statement-breakpoint
CREATE INDEX "product_images_cleanup_pending_idx" ON "product_images" USING btree ("cleanup_pending","updated_at");--> statement-breakpoint
CREATE INDEX "product_images_storage_key_idx" ON "product_images" USING btree ("storage_key");--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_cleanup_attempts_nonnegative" CHECK ("product_images"."cleanup_attempts" >= 0);