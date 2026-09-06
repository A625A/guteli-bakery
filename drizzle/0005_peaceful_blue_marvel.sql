ALTER TABLE "orders" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "terminal_at" timestamp with time zone;--> statement-breakpoint
UPDATE "orders"
SET "terminal_at" = "updated_at"
WHERE "order_status" IN ('COMPLETED', 'CANCELLED');--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_version_positive" CHECK ("orders"."version" >= 1);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_terminal_timestamp_consistent" CHECK (
        (
          "orders"."order_status" IN ('COMPLETED', 'CANCELLED')
          AND "orders"."terminal_at" IS NOT NULL
        )
        OR
        (
          "orders"."order_status" NOT IN ('COMPLETED', 'CANCELLED')
          AND "orders"."terminal_at" IS NULL
        )
      );
