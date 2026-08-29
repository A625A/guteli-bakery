ALTER TABLE "orders" DROP CONSTRAINT "orders_fulfillment_totals";--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "sale_unit" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_fulfillment_totals" CHECK (
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
          AND btrim("orders"."delivery_location") <> ''
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
      );