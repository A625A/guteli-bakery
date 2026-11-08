ALTER TABLE "orders" ADD COLUMN "delivery_latitude" double precision;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_longitude" double precision;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_area_id" varchar(80);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_coverage_version" varchar(80);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_pricing_source" varchar(20);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_point_valid" CHECK (("orders"."delivery_latitude" IS NULL AND "orders"."delivery_longitude" IS NULL) OR ("orders"."fulfillment" = 'DELIVERY' AND "orders"."anonymized_at" IS NULL AND "orders"."delivery_latitude" IS NOT NULL AND "orders"."delivery_longitude" IS NOT NULL AND "orders"."delivery_latitude" BETWEEN -90 AND 90 AND "orders"."delivery_longitude" BETWEEN -180 AND 180));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_source_valid" CHECK ("orders"."delivery_pricing_source" IS NULL OR ("orders"."fulfillment" = 'DELIVERY' AND "orders"."delivery_pricing_source" IN ('AUTOMATIC', 'MANUAL', 'MANUAL_PENDING')));