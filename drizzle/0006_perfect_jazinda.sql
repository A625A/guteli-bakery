ALTER TABLE "categories" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_version_positive" CHECK ("categories"."version" > 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_version_positive" CHECK ("products"."version" > 0);