CREATE TYPE "public"."outbox_state" AS ENUM('PENDING', 'BLOCKED', 'SENT', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."fulfillment" AS ENUM('PICKUP', 'DELIVERY');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('RECEIVED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid NOT NULL,
	"request_id" varchar(128) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation" varchar(64) NOT NULL,
	"subject" varchar(128) NOT NULL,
	"key" varchar(128) NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"order_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"state" "outbox_state" DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_expires_at" timestamp with time zone,
	"provider_message_id" varchar(256),
	"last_error_code" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "outbox_events_attempts_nonnegative" CHECK ("outbox_events"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy" varchar(64) NOT NULL,
	"subject" varchar(128) NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rate_limit_buckets_count_nonnegative" CHECK ("rate_limit_buckets"."count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"source_product_id" uuid NOT NULL,
	"product_name" varchar(160) NOT NULL,
	"category_label" varchar(160) NOT NULL,
	"sale_unit" varchar(80) NOT NULL,
	"unit_price_minor" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_minor" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "order_items_unit_price_nonnegative" CHECK ("order_items"."unit_price_minor" >= 0),
	CONSTRAINT "order_items_line_total_nonnegative" CHECK ("order_items"."line_total_minor" >= 0),
	CONSTRAINT "order_items_snapshot_total_exact" CHECK ("order_items"."line_total_minor" = "order_items"."unit_price_minor" * "order_items"."quantity")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" varchar(32) NOT NULL,
	"customer_name" varchar(100) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"fulfillment" "fulfillment" NOT NULL,
	"requested_date" date NOT NULL,
	"delivery_location" varchar(300),
	"notes" varchar(500),
	"subtotal_minor" integer NOT NULL,
	"shipping_minor" integer,
	"total_minor" integer,
	"order_status" "order_status" DEFAULT 'RECEIVED' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'UNPAID' NOT NULL,
	"receipt_token_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"anonymized_at" timestamp with time zone,
	CONSTRAINT "orders_subtotal_nonnegative" CHECK ("orders"."subtotal_minor" >= 0),
	CONSTRAINT "orders_shipping_nonnegative" CHECK ("orders"."shipping_minor" IS NULL OR "orders"."shipping_minor" >= 0),
	CONSTRAINT "orders_total_nonnegative" CHECK ("orders"."total_minor" IS NULL OR "orders"."total_minor" >= 0),
	CONSTRAINT "orders_fulfillment_totals" CHECK (
        (
          "orders"."fulfillment" = 'PICKUP'
          AND "orders"."delivery_location" IS NULL
          AND "orders"."shipping_minor" = 0
          AND "orders"."total_minor" = "orders"."subtotal_minor"
        )
        OR
        (
          "orders"."fulfillment" = 'DELIVERY'
          AND "orders"."delivery_location" IS NOT NULL
          AND (
            ("orders"."shipping_minor" IS NULL AND "orders"."total_minor" IS NULL)
            OR
            (
              "orders"."shipping_minor" IS NOT NULL
              AND "orders"."total_minor" IS NOT NULL
              AND "orders"."total_minor" = "orders"."subtotal_minor" + "orders"."shipping_minor"
            )
          )
        )
      )
);
--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_source_product_id_products_id_fk" FOREIGN KEY ("source_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_records_operation_subject_key_idx" ON "idempotency_records" USING btree ("operation","subject","key");--> statement-breakpoint
CREATE INDEX "idempotency_records_expires_at_idx" ON "idempotency_records" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "outbox_events_due_work_idx" ON "outbox_events" USING btree ("state","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limit_buckets_policy_subject_window_idx" ON "rate_limit_buckets" USING btree ("policy","subject","window_started_at");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_public_id_idx" ON "orders" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_receipt_token_hash_idx" ON "orders" USING btree ("receipt_token_hash");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_order_status_idx" ON "orders" USING btree ("order_status");