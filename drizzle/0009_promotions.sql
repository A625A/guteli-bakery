CREATE TABLE "promotion_products" (
	"promotion_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	CONSTRAINT "promotion_products_promotion_id_product_id_pk" PRIMARY KEY("promotion_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"scope" varchar(16) NOT NULL,
	"discount_bps" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promotions_scope_valid" CHECK ("promotions"."scope" IN ('CATALOG', 'SELECTED')),
	CONSTRAINT "promotions_discount_valid" CHECK ("promotions"."discount_bps" BETWEEN 1 AND 10000),
	CONSTRAINT "promotions_window_valid" CHECK ("promotions"."ends_at" > "promotions"."starts_at"),
	CONSTRAINT "promotions_version_positive" CHECK ("promotions"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "promotion_products" ADD CONSTRAINT "promotion_products_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_products" ADD CONSTRAINT "promotion_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "promotions_active_window_idx" ON "promotions" USING btree ("enabled","starts_at","ends_at");